import asyncHandler from 'express-async-handler';
import { normalizeAccountHashOrPublicKey, normalizeHashHex } from '../casper/utils';
import { fetchCep18Allowance, resolveContractHash } from '../services/casperTokenService';

export const getCasperTokenAllowance = asyncHandler(async (req, res) => {
  const ownerAccountHashRaw = String(req.query.ownerAccountHash ?? '').trim();
  const tokenContractHash = String(req.query.tokenContractHash ?? '').trim();
  const spenderContractHash = String(req.query.spenderContractHash ?? '').trim();

  if (!ownerAccountHashRaw || !tokenContractHash || !spenderContractHash) {
    res.status(400).json({
      ok: false,
      error: 'ownerAccountHash, tokenContractHash, and spenderContractHash are required',
    });
    return;
  }

  const ownerAccountHash = normalizeAccountHashOrPublicKey(ownerAccountHashRaw);

  const resolvedTokenContractHash = await resolveContractHash(tokenContractHash);
  //const resolvedSpenderContractHash = await resolveContractHash(spenderContractHash);

  try {
    const result = await fetchCep18Allowance({
      ownerAccountHash,
      tokenContractHash,
      spenderContractHash,
    });

    res.json({
      ok: true,
      ownerAccountHash: normalizeHashHex(ownerAccountHash),
      tokenContractHash: normalizeHashHex(tokenContractHash),
      spenderContractHash: normalizeHashHex(spenderContractHash),
      resolvedTokenContractHash: normalizeHashHex(result.tokenContractHash),
      resolvedSpenderContractHash: normalizeHashHex(result.spenderContractHash),
      allowance: result.allowance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    res.json({
      ok: true,
      ownerAccountHash: normalizeHashHex(ownerAccountHash),
      tokenContractHash: normalizeHashHex(tokenContractHash),
      spenderContractHash: normalizeHashHex(spenderContractHash),
      resolvedTokenContractHash: normalizeHashHex(resolvedTokenContractHash),
      resolvedSpenderContractHash: spenderContractHash, //normalizeHashHex(resolvedSpenderContractHash),
      allowance: '0',
      warning: message,
    });
  }
});
