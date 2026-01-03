import asyncHandler from 'express-async-handler';
import { prisma } from '../db/prisma';
import { queryContract, queryContractPackage } from '../casper/onchain';
import { speculativeCall } from '../casper/speculative';
import { SimpleCache } from '../utils/cache';
import { normalizeKeyHex } from '../utils/keys';
import { CLValue, Key } from 'casper-js-sdk';

const cache = new SimpleCache();
const CACHE_TTL_MS = 15_000;

function extractLatestContractHash(result: any): string | null {
  const pkg = result?.storedValue?.contractPackage ?? result?.storedValue?.contract_package;
  const versions = pkg?.versions;
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const latest = versions[versions.length - 1];
  const contractHash = latest?.contractHash ?? latest?.contract_hash;
  if (!contractHash) return null;
  if (typeof contractHash === 'string') return normalizeKeyHex(contractHash);
  if (typeof contractHash.toJSON === 'function') {
    return normalizeKeyHex(contractHash.toJSON());
  }
  return null;
}

export const getContractPackage = asyncHandler(async (req, res) => {
  const hash = normalizeKeyHex(req.params.hash);
  const cacheKey = `onchain:package:${hash}`;
  const cached = cache.get<unknown>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const { key, result } = await queryContractPackage(hash);
  const response = { ok: true, hash, key, result };
  cache.set(cacheKey, response, CACHE_TTL_MS);
  res.json(response);
});

export const getContract = asyncHandler(async (req, res) => {
  const hash = normalizeKeyHex(req.params.hash);
  const cacheKey = `onchain:contract:${hash}`;
  const cached = cache.get<unknown>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const { key, result } = await queryContract(hash);
  const response = { ok: true, hash, key, result };
  cache.set(cacheKey, response, CACHE_TTL_MS);
  res.json(response);
});

export const getMarketOnchain = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const cacheKey = `onchain:market:${asset}`;
  const cached = cache.get<unknown>(cacheKey);
  if (cached) {
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

  const packageHash = normalizeKeyHex(market.market);
  const packageQuery = await queryContractPackage(packageHash);
  const contractHash = extractLatestContractHash(packageQuery.result);
  const contractResult = contractHash ? await queryContract(contractHash) : null;

  const response = {
    ok: true,
    asset,
    marketPackageHash: packageHash,
    contractHash,
    packageResult: packageQuery.result,
    packageKey: packageQuery.key,
    contractResult,
  };

  cache.set(cacheKey, response, CACHE_TTL_MS);
  res.json(response);
});

function buildKeyArg(value: string, keyType: string | undefined): Key {
  if (value.includes('-')) {
    return Key.newKey(value);
  }
  const prefix = keyType === 'hash' ? 'hash' : 'account-hash';
  return Key.newKey(`${prefix}-${normalizeKeyHex(value)}`);
}

export const callMarketGetter = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const entryPoint = req.params.entrypoint;
  const keyArg = req.query.key as string | undefined;
  const keyType = req.query.keyType as string | undefined;

  const market = await prisma.marketRegisteredEvent.findFirst({
    where: { asset },
    orderBy: { createdAt: 'desc' },
  });

  if (!market) {
    res.status(404).json({ ok: false, error: 'market_not_found' });
    return;
  }

  const packageHash = normalizeKeyHex(market.market);
  const packageQuery = await queryContractPackage(packageHash);
  const contractHash = extractLatestContractHash(packageQuery.result);
  if (!contractHash) {
    res.status(500).json({ ok: false, error: 'contract_hash_not_found' });
    return;
  }

  const args: Record<string, CLValue> = {};
  if (keyArg) {
    const keyValue = CLValue.newCLKey(buildKeyArg(keyArg, keyType));
    const lower = entryPoint.toLowerCase();
    if (lower.includes('borrower')) {
      args.borrower = keyValue;
    } else {
      args.owner = keyValue;
    }
  }

  const result = await speculativeCall(contractHash, entryPoint, args);

  res.json({
    ok: true,
    asset,
    marketPackageHash: packageHash,
    contractHash,
    entryPoint,
    result,
  });
});

export const getMarketGetters = asyncHandler(async (req, res) => {
  const asset = normalizeKeyHex(req.params.asset);
  const cacheKey = `onchain:getters:${asset}`;
  const cached = cache.get<unknown>(cacheKey);
  if (cached) {
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

  const packageHash = normalizeKeyHex(market.market);
  const packageQuery = await queryContractPackage(packageHash);
  const contractHash = extractLatestContractHash(packageQuery.result);
  if (!contractHash) {
    res.status(500).json({ ok: false, error: 'contract_hash_not_found' });
    return;
  }

  const entrypoints = [
    'get_cash',
    'get_total_borrows',
    'get_total_reserves',
    'get_supply_index',
    'get_borrow_index',
    'get_utilization',
    'get_supply_rate_per_sec',
    'get_borrow_rate_per_sec',
    'get_rate_model',
    'get_risk_params',
  ];

  const results: Record<string, unknown> = {};
  for (const name of entrypoints) {
    results[name] = await speculativeCall(contractHash, name);
  }

  const response = {
    ok: true,
    asset,
    marketPackageHash: packageHash,
    contractHash,
    results,
  };

  cache.set(cacheKey, response, CACHE_TTL_MS);
  res.json(response);
});
