import asyncHandler from 'express-async-handler';
import { normalizeAccountHashOrPublicKey, normalizeHashHex } from '../casper/utils';
import { fetchCep18Balance, resolveContractHash } from '../services/casperTokenService';

export const getCasperTokenBalance = asyncHandler(async (req, res) => {
  const ownerAccountHashRaw = String(req.query.accountHash ?? '').trim();
  const tokenContractHash = String(req.query.contractHash ?? '').trim();

  if (!ownerAccountHashRaw || !tokenContractHash) {
    res.status(400).json({
      ok: false,
      error: 'accountHash and contractHash are required',
    });
    return;
  }

  const ownerAccountHash = normalizeAccountHashOrPublicKey(ownerAccountHashRaw);

  const resolvedContractHash = await resolveContractHash(tokenContractHash);

  try {
    const result = await fetchCep18Balance({
      ownerAccountHash,
      tokenContractHash,
    });

    res.json({
      ok: true,
      accountHash: normalizeHashHex(ownerAccountHash),
      contractHash: normalizeHashHex(tokenContractHash),
      resolvedContractHash: normalizeHashHex(result.contractHash),
      balance: result.balance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    res.json({
      ok: true,
      accountHash: normalizeHashHex(ownerAccountHash),
      contractHash: normalizeHashHex(tokenContractHash),
      resolvedContractHash: normalizeHashHex(resolvedContractHash),
      balance: '0',
      warning: message,
    });
  }
});
