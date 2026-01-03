import asyncHandler from 'express-async-handler';
import { config } from '../config/config';
import { prisma } from '../db/prisma';
import { normalizeKeyHex } from '../utils/keys';

type BackfillMarketBody = {
  asset?: string;
  market?: string;
  aToken?: string;
  oracle?: string;
  contractPackageHash?: string;
  deployHash?: string;
  blockHash?: string;
};

function requireField(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`missing_${name}`);
  }
  return value;
}

export const backfillMarket = asyncHandler(async (req, res) => {
  const body = req.body as BackfillMarketBody;
  const asset = normalizeKeyHex(requireField(body.asset, 'asset'));
  const market = normalizeKeyHex(requireField(body.market, 'market'));
  const aToken = normalizeKeyHex(requireField(body.aToken, 'aToken'));
  const oracle = normalizeKeyHex(requireField(body.oracle, 'oracle'));
  const contractPackageHash = normalizeKeyHex(
    body.contractPackageHash ?? config.EVENT_CONTRACT_PACKAGE_HASHES[0],
  );

  const record = await prisma.marketRegisteredEvent.create({
    data: {
      contractPackageHash,
      asset,
      market,
      aToken,
      oracle,
      deployHash: body.deployHash ?? '',
      blockHash: body.blockHash ?? '',
    },
  });

  res.json({ ok: true, record });
});
