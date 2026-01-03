import asyncHandler from 'express-async-handler';
import { config } from '../config/config';
import { prisma } from '../db/prisma';
import { runOracleFeederOnce } from '../oracle/feeder';
import { normalizeKeyHex } from '../utils/keys';

const PRICE_EVENT = 'PriceUpdated';

export const runOnce = asyncHandler(async (_req, res) => {
  const deployHashes = await runOracleFeederOnce();
  res.json({ ok: true, deployHashes });
});

export const getLatestEvent = asyncHandler(async (_req, res) => {
  const event = await prisma.contractEvent.findFirst({
    where: {
      contract: config.ORACLE_CONTRACT_PACKAGE_HASH,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    ok: true,
    event,
  });
});

export const getLatestPrice = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol?.toLowerCase();
  const meta = symbol ? config.ASSET_ID_MAP[symbol] : undefined;

  if (!meta) {
    res.status(404).json({ ok: false, error: 'asset_not_found' });
    return;
  }

  const candidates = await prisma.contractEvent.findMany({
    where: {
      contract: config.ORACLE_CONTRACT_PACKAGE_HASH,
      eventType: PRICE_EVENT,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  const expectedAsset = normalizeKeyHex(meta.assetHash);
  for (const event of candidates) {
    try {
      const payload = JSON.parse(event.payloadJson) as { asset?: string; price?: string; timestamp?: number };
      if (!payload.asset || !payload.price) continue;
      const eventAsset = normalizeKeyHex(payload.asset);
      if (eventAsset !== expectedAsset) continue;
      res.json({
        ok: true,
        symbol,
        asset: payload.asset,
        price: payload.price,
        timestamp: payload.timestamp ?? null,
        deployHash: event.deployHash,
        blockHash: event.blockHash,
        observedAt: event.createdAt,
      });
      return;
    } catch {
      continue;
    }
  }

  res.status(404).json({ ok: false, error: 'price_not_found' });
});
