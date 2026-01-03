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

function toBigInt(value: string): bigint {
  return BigInt(value);
}

function sumAmounts(items: Array<{ amount: string }>): bigint {
  return items.reduce((acc, item) => acc + toBigInt(item.amount), 0n);
}

const WAD = 1_000_000_000_000_000_000n;

function wadMul(a: bigint, b: bigint): bigint {
  return (a * b) / WAD;
}

export const listRecentActivity = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);

  const [deposits, withdrawals, borrows, repays, liquidations] = await Promise.all([
    prisma.depositEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.withdrawEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.borrowEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.repayEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.liquidateEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
  ]);

  const combined = [
    ...deposits.map((event) => ({ type: 'Deposit', event })),
    ...withdrawals.map((event) => ({ type: 'Withdraw', event })),
    ...borrows.map((event) => ({ type: 'Borrow', event })),
    ...repays.map((event) => ({ type: 'Repay', event })),
    ...liquidations.map((event) => ({ type: 'Liquidate', event })),
  ].sort((a, b) => b.event.createdAt.getTime() - a.event.createdAt.getTime());

  res.json({ ok: true, activity: combined.slice(0, limit) });
});

export const listAccountActivity = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const account = normalizeKeyHex(req.params.account);

  const [deposits, withdrawals, borrows, repays, liquidations] = await Promise.all([
    prisma.depositEvent.findMany({
      where: { account },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.withdrawEvent.findMany({
      where: { account },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.borrowEvent.findMany({
      where: { account },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.repayEvent.findMany({
      where: { account },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.liquidateEvent.findMany({
      where: { OR: [{ borrower: account }, { liquidator: account }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const combined = [
    ...deposits.map((event) => ({ type: 'Deposit', event })),
    ...withdrawals.map((event) => ({ type: 'Withdraw', event })),
    ...borrows.map((event) => ({ type: 'Borrow', event })),
    ...repays.map((event) => ({ type: 'Repay', event })),
    ...liquidations.map((event) => ({ type: 'Liquidate', event })),
  ].sort((a, b) => b.event.createdAt.getTime() - a.event.createdAt.getTime());

  res.json({ ok: true, activity: combined.slice(0, limit) });
});

export const getAccountPosition = asyncHandler(async (req, res) => {
  const account = normalizeKeyHex(req.params.account);

  const [deposits, withdrawals, borrows, repays] = await Promise.all([
    prisma.depositEvent.findMany({ where: { account }, select: { amount: true } }),
    prisma.withdrawEvent.findMany({ where: { account }, select: { amount: true } }),
    prisma.borrowEvent.findMany({ where: { account }, select: { amount: true } }),
    prisma.repayEvent.findMany({ where: { account }, select: { amount: true } }),
  ]);

  const totalDeposits = sumAmounts(deposits);
  const totalWithdrawals = sumAmounts(withdrawals);
  const totalBorrows = sumAmounts(borrows);
  const totalRepays = sumAmounts(repays);

  const netSupply = totalDeposits - totalWithdrawals;
  const netBorrow = totalBorrows - totalRepays;

  res.json({
    ok: true,
    account,
    totals: {
      deposits: totalDeposits.toString(),
      withdrawals: totalWithdrawals.toString(),
      borrows: totalBorrows.toString(),
      repays: totalRepays.toString(),
    },
    net: {
      supply: netSupply.toString(),
      borrow: netBorrow.toString(),
    },
  });
});

export const getAccountPositions = asyncHandler(async (req, res) => {
  const account = normalizeKeyHex(req.params.account);
  const marketPackageHash =
    typeof req.query.marketPackageHash === 'string' && req.query.marketPackageHash.length > 0
      ? normalizeKeyHex(req.query.marketPackageHash)
      : null;
  const assetFilter =
    typeof req.query.asset === 'string' && req.query.asset.length > 0
      ? normalizeKeyHex(req.query.asset)
      : null;

  const [deposits, withdrawals, borrows, repays] = await Promise.all([
    prisma.depositEvent.findMany({
      where: { account },
      select: { amount: true, contractPackageHash: true },
    }),
    prisma.withdrawEvent.findMany({
      where: { account },
      select: { amount: true, contractPackageHash: true },
    }),
    prisma.borrowEvent.findMany({
      where: { account },
      select: { amount: true, contractPackageHash: true },
    }),
    prisma.repayEvent.findMany({
      where: { account },
      select: { amount: true, contractPackageHash: true },
    }),
  ]);

  const positions = new Map<
    string,
    {
      deposits: bigint;
      withdrawals: bigint;
      borrows: bigint;
      repays: bigint;
    }
  >();

  const ensurePosition = (market: string) => {
    const current = positions.get(market);
    if (current) return current;
    const next = { deposits: 0n, withdrawals: 0n, borrows: 0n, repays: 0n };
    positions.set(market, next);
    return next;
  };

  for (const event of deposits) {
    ensurePosition(event.contractPackageHash).deposits += toBigInt(event.amount);
  }
  for (const event of withdrawals) {
    ensurePosition(event.contractPackageHash).withdrawals += toBigInt(event.amount);
  }
  for (const event of borrows) {
    ensurePosition(event.contractPackageHash).borrows += toBigInt(event.amount);
  }
  for (const event of repays) {
    ensurePosition(event.contractPackageHash).repays += toBigInt(event.amount);
  }

  let marketPackageHashes = Array.from(positions.keys());
  if (marketPackageHash) {
    marketPackageHashes = marketPackageHashes.filter((value) => value === marketPackageHash);
  }
  const marketRecords = await Promise.all(
    marketPackageHashes.map((marketPackageHash) =>
      prisma.marketRegisteredEvent.findFirst({
        where: { market: marketPackageHash },
        orderBy: { createdAt: 'desc' },
      }),
    ),
  );

  const marketByPackage = new Map(
    marketRecords.filter(Boolean).map((record) => [record!.market, record]),
  );

  let summaries = await Promise.all(
    marketPackageHashes.map(async (marketPackageHash) => {
      const totals = positions.get(marketPackageHash)!;
      const market = marketByPackage.get(marketPackageHash) ?? null;
      const asset = market ? market.asset : null;

      const [price, riskParams, rateModel] = await Promise.all([
        asset
          ? prisma.priceUpdateEvent.findFirst({
              where: { asset },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve(null),
        prisma.riskParamsUpdatedEvent.findFirst({
          where: { contractPackageHash: marketPackageHash },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.rateModelUpdatedEvent.findFirst({
          where: { contractPackageHash: marketPackageHash },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const netSupply = totals.deposits - totals.withdrawals;
      const netBorrow = totals.borrows - totals.repays;
      const collateralFactor = riskParams?.collateralFactor
        ? toBigInt(riskParams.collateralFactor)
        : 0n;
      const liquidationThreshold = riskParams?.liquidationThreshold
        ? toBigInt(riskParams.liquidationThreshold)
        : 0n;
      const borrowLimit = wadMul(netSupply, collateralFactor);
      const liquidationThresholdValue = wadMul(netSupply, liquidationThreshold);
      const availableBorrow = borrowLimit > netBorrow ? borrowLimit - netBorrow : 0n;
      const healthFactor =
        netBorrow > 0n ? ((netSupply * liquidationThreshold) / netBorrow).toString() : null;

      return {
        marketPackageHash,
        asset,
        market,
        totals: {
          deposits: totals.deposits.toString(),
          withdrawals: totals.withdrawals.toString(),
          borrows: totals.borrows.toString(),
          repays: totals.repays.toString(),
        },
        net: {
          supply: netSupply.toString(),
          borrow: netBorrow.toString(),
        },
        derived: {
          borrowLimit: borrowLimit.toString(),
          liquidationThreshold: liquidationThresholdValue.toString(),
          availableBorrow: availableBorrow.toString(),
          healthFactor,
        },
        price,
        riskParams,
        rateModel,
      };
    }),
  );

  if (assetFilter) {
    summaries = summaries.filter((summary) => summary.asset === assetFilter);
  }

  res.json(
    serializeBigInt({
      ok: true,
      account,
      positions: summaries,
    }),
  );
});
