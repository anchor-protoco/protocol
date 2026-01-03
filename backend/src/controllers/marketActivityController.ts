import asyncHandler from 'express-async-handler';
import { prisma } from '../db/prisma';
import { normalizeKeyHex } from '../utils/keys';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
}

export const listMarketActivity = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const limit = parseLimit(req.query.limit);

  const market = await prisma.marketRegisteredEvent.findFirst({
    where: { asset },
    orderBy: { createdAt: 'desc' },
  });

  if (!market) {
    res.status(404).json({ ok: false, error: 'market_not_found' });
    return;
  }

  const marketPackageHash = market.market;
  const [deposits, withdrawals, borrows, repays, liquidations] = await Promise.all([
    prisma.depositEvent.findMany({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.withdrawEvent.findMany({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.borrowEvent.findMany({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.repayEvent.findMany({
      where: { contractPackageHash: marketPackageHash },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.liquidateEvent.findMany({
      where: { contractPackageHash: marketPackageHash },
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

  res.json({
    ok: true,
    asset,
    marketPackageHash,
    activity: combined.slice(0, limit),
  });
});
