import asyncHandler from 'express-async-handler';
import { prisma } from '../db/prisma';

export const getEventHealth = asyncHandler(async (_req, res) => {
  const [latestEvent, latestPrice, latestDeposit, latestBorrow] = await Promise.all([
    prisma.contractEvent.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.priceUpdateEvent.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.depositEvent.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.borrowEvent.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);

  res.json({
    ok: true,
    latest: {
      contractEventAt: latestEvent?.createdAt ?? null,
      priceEventAt: latestPrice?.createdAt ?? null,
      depositEventAt: latestDeposit?.createdAt ?? null,
      borrowEventAt: latestBorrow?.createdAt ?? null,
    },
  });
});
