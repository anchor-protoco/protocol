import asyncHandler from 'express-async-handler';
import { prisma } from '../db/prisma';
import { SimpleCache } from '../utils/cache';
import { serializeBigInt } from '../utils/json';
import { normalizeKeyHex } from '../utils/keys';

const cache = new SimpleCache();
const CACHE_TTL_MS = 15_000;

function normalizeOptionalHash(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return normalizeKeyHex(value);
}

function sumAmounts(items: Array<{ amount: string }>): bigint {
  return items.reduce((acc, item) => acc + BigInt(item.amount), 0n);
}

export const getMarketState = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const marketPackageHash = normalizeOptionalHash(req.query.marketPackageHash);
  const skipCache = req.query.fresh === '1' || req.query.noCache === '1';
  const cacheKey = `market-state:${asset}:${marketPackageHash ?? 'none'}`;
  const cached = skipCache ? null : cache.get<unknown>(cacheKey);
  if (!skipCache && cached) {
    res.json(cached);
    return;
  }

  const [market, latestPrice] = await Promise.all([
    prisma.marketRegisteredEvent.findFirst({
      where: { asset },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.priceUpdateEvent.findFirst({
      where: { asset },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!market) {
    res.status(404).json({ ok: false, error: 'market_not_found' });
    return;
  }

  const resolvedMarketPackageHash = marketPackageHash ?? market.market;
  let totals = null;
  if (resolvedMarketPackageHash) {
    const [deposits, withdrawals, borrows, repays] = await Promise.all([
      prisma.depositEvent.findMany({
        where: { contractPackageHash: resolvedMarketPackageHash },
        select: { amount: true },
      }),
      prisma.withdrawEvent.findMany({
        where: { contractPackageHash: resolvedMarketPackageHash },
        select: { amount: true },
      }),
      prisma.borrowEvent.findMany({
        where: { contractPackageHash: resolvedMarketPackageHash },
        select: { amount: true },
      }),
      prisma.repayEvent.findMany({
        where: { contractPackageHash: resolvedMarketPackageHash },
        select: { amount: true },
      }),
    ]);

    const totalDeposits = sumAmounts(deposits);
    const totalWithdrawals = sumAmounts(withdrawals);
    const totalBorrows = sumAmounts(borrows);
    const totalRepays = sumAmounts(repays);

    totals = {
      deposits: totalDeposits.toString(),
      withdrawals: totalWithdrawals.toString(),
      borrows: totalBorrows.toString(),
      repays: totalRepays.toString(),
      netSupply: (totalDeposits - totalWithdrawals).toString(),
      netBorrow: (totalBorrows - totalRepays).toString(),
    };
  }

  const response = {
    ok: true,
    asset,
    market,
    price: latestPrice,
    totals,
    marketPackageHash: resolvedMarketPackageHash,
    source: 'events',
  };

  const serialized = serializeBigInt(response);
  cache.set(cacheKey, serialized, CACHE_TTL_MS);
  res.json(serialized);
});

export const getMarketParams = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const skipCache = req.query.fresh === '1' || req.query.noCache === '1';
  const cacheKey = `market-params:${asset}`;
  const cached = skipCache ? null : cache.get<unknown>(cacheKey);
  if (!skipCache && cached) {
    res.json(cached);
    return;
  }

  const market = await prisma.marketRegisteredEvent.findFirst({
    where: { asset },
    orderBy: { createdAt: 'desc' },
  });

  if (!market) {
    res.status(404).json({ ok: false, error: 'market_not_found' });
    return;
  }

  const response = {
    ok: true,
    asset,
    market,
    source: 'events',
  };

  const serialized = serializeBigInt(response);
  cache.set(cacheKey, serialized, CACHE_TTL_MS);
  res.json(serialized);
});

export const getMarketSummary = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const skipCache = req.query.fresh === '1' || req.query.noCache === '1';
  const cacheKey = `market-summary:${asset}`;
  const cached = skipCache ? null : cache.get<unknown>(cacheKey);
  if (!skipCache && cached) {
    res.json(cached);
    return;
  }

  const market = await prisma.marketRegisteredEvent.findFirst({
    where: { asset },
    orderBy: { createdAt: 'desc' },
  });

  if (!market) {
    res.status(404).json({ ok: false, error: 'market_not_found' });
    return;
  }

  const marketPackageHash = market.market;
  const [
    latestState,
    latestPrice,
    rateModel,
    riskParams,
    marketActive,
    pauseFlags,
    metadata,
  ] = await Promise.all([
    prisma.marketStateUpdatedEvent.findFirst({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.priceUpdateEvent.findFirst({
      where: { asset },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rateModelUpdatedEvent.findFirst({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.riskParamsUpdatedEvent.findFirst({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.marketActiveUpdatedEvent.findFirst({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pauseFlagsUpdatedEvent.findFirst({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.marketMetadata.findFirst({
      where: { asset },
    }),
  ]);

  const response = {
    ok: true,
    asset,
    market,
    marketPackageHash,
    metadata,
    price: latestPrice,
    state: latestState,
    rateModel,
    riskParams,
    isActive: marketActive ? marketActive.isActive : true,
    pauseFlags: pauseFlags
      ? {
          supplyPaused: pauseFlags.supplyPaused,
          borrowPaused: pauseFlags.borrowPaused,
          withdrawPaused: pauseFlags.withdrawPaused,
          repayPaused: pauseFlags.repayPaused,
          liquidationPaused: pauseFlags.liquidationPaused,
        }
      : null,
    source: 'events',
  };

  const serialized = serializeBigInt(response);
  cache.set(cacheKey, serialized, CACHE_TTL_MS);
  res.json(serialized);
});
