import asyncHandler from 'express-async-handler';
import { prisma } from '../db/prisma';
import { serializeBigInt } from '../utils/json';
import { normalizeKeyHex } from '../utils/keys';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
}

export const listMarkets = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const events = await prisma.marketRegisteredEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit * 2, MAX_LIMIT),
  });

  const seen = new Set<string>();
  const markets = [];
  for (const event of events) {
    if (seen.has(event.asset)) continue;
    seen.add(event.asset);
    markets.push(event);
    if (markets.length >= limit) break;
  }

  res.json({ ok: true, markets });
});

export const getMarketByAsset = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const event = await prisma.marketRegisteredEvent.findFirst({
    where: { asset },
    orderBy: { createdAt: 'desc' },
  });

  if (!event) {
    res.status(404).json({ ok: false, error: 'market_not_found' });
    return;
  }

  res.json({ ok: true, market: event, marketPackageHash: event.market });
});

export const listLatestPrices = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const events = await prisma.priceUpdateEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit * 2, MAX_LIMIT),
  });

  const seen = new Set<string>();
  const prices = [];
  for (const event of events) {
    if (seen.has(event.asset)) continue;
    seen.add(event.asset);
    prices.push(event);
    if (prices.length >= limit) break;
  }

  res.json({ ok: true, prices });
});

export const listMarketSummaries = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const events = await prisma.marketRegisteredEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit * 2, MAX_LIMIT),
  });

  const seen = new Set<string>();
  const markets = [];
  for (const event of events) {
    if (seen.has(event.asset)) continue;
    seen.add(event.asset);
    markets.push(event);
    if (markets.length >= limit) break;
  }

  const summaries = await Promise.all(
    markets.map(async (market) => {
      const marketPackageHash = market.market;
      const [
        state,
        price,
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
          where: { asset: market.asset },
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
          where: { asset: market.asset },
        }),
      ]);

      return {
        market,
        marketPackageHash,
        metadata,
        price,
        state,
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
      };
    }),
  );

  res.json(serializeBigInt({ ok: true, markets: summaries }));
});

export const upsertMarketMetadata = asyncHandler(async (req, res) => {
  const {
    asset,
    name,
    symbol,
    decimals,
    logoUrl,
    description,
    websiteUrl,
    coingeckoId,
  } = req.body ?? {};

  if (!asset || typeof asset !== 'string') {
    res.status(400).json({ ok: false, error: 'asset_required' });
    return;
  }
  if (!name || typeof name !== 'string') {
    res.status(400).json({ ok: false, error: 'name_required' });
    return;
  }
  if (!symbol || typeof symbol !== 'string') {
    res.status(400).json({ ok: false, error: 'symbol_required' });
    return;
  }

  const parsedDecimals = Number.parseInt(String(decimals ?? ''), 10);
  if (!Number.isFinite(parsedDecimals) || parsedDecimals < 0) {
    res.status(400).json({ ok: false, error: 'decimals_invalid' });
    return;
  }

  const normalizedAsset = normalizeKeyHex(asset);
  const metadata = await prisma.marketMetadata.upsert({
    where: { asset: normalizedAsset },
    update: {
      name,
      symbol,
      decimals: parsedDecimals,
      logoUrl,
      description,
      websiteUrl,
      coingeckoId,
    },
    create: {
      asset: normalizedAsset,
      name,
      symbol,
      decimals: parsedDecimals,
      logoUrl,
      description,
      websiteUrl,
      coingeckoId,
    },
  });

  res.json({ ok: true, metadata });
});
