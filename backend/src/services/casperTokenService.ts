import {
  ParamDictionaryIdentifier,
  ParamDictionaryIdentifierContractNamedKey,
  RpcClient,
} from 'casper-js-sdk';
import { createRpcClient } from '../casper/rpc';
import { queryContractPackage } from '../casper/onchain';
import {
  makeAllowanceDictionaryKey,
  makeBalanceDictionaryKey,
  normalizeHashHex,
} from '../casper/utils';

const DICT_BALANCES = 'balances';
const DICT_ALLOWANCES = 'allowances';

function toParsedValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Math.trunc(value).toString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'object' && value !== null) {
    const record = value as { parsed?: unknown };
    if (record.parsed !== undefined) {
      return toParsedValue(record.parsed);
    }
  }
  return null;
}

async function getDictionaryValue(
  rpcClient: RpcClient,
  contractHashHex: string,
  dictionaryName: string,
  dictionaryItemKey: string,
): Promise<string> {
  try {
    const stateRootHash = (await rpcClient.getStateRootHashLatest()).stateRootHash.toHex();
    const identifier = new ParamDictionaryIdentifier(
      undefined,
      new ParamDictionaryIdentifierContractNamedKey(
        `hash-${normalizeHashHex(contractHashHex)}`,
        dictionaryName,
        dictionaryItemKey,
      ),
    );

    const result = await rpcClient.getDictionaryItemByIdentifier(stateRootHash, identifier);
    const parsed = result.storedValue?.clValue?.toJSON?.();
    return toParsedValue(parsed) ?? '0';
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('dictionary') && message.includes('not') && message.includes('found')) {
      return '0';
    }
    throw error;
  }
}

function extractLatestContractHash(result: any): string | null {
  const pkg = result?.storedValue?.contractPackage ?? result?.storedValue?.contract_package;
  const versions = pkg?.versions;
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const latest = versions[versions.length - 1];
  const contractHash = latest?.contractHash ?? latest?.contract_hash;
  if (!contractHash) return null;
  if (typeof contractHash === 'string') return normalizeHashHex(contractHash);
  if (typeof contractHash.toJSON === 'function') {
    return normalizeHashHex(contractHash.toJSON());
  }
  return null;
}

export async function resolveContractHash(inputHash: string): Promise<string> {
  const normalized = normalizeHashHex(inputHash);
  try {
    const { result } = await queryContractPackage(normalized);
    const contractHash = extractLatestContractHash(result);
    return contractHash ?? normalized;
  } catch {
    return normalized;
  }
}

export async function fetchCep18Balance(params: {
  tokenContractHash: string;
  ownerAccountHash: string;
}): Promise<{ balance: string; contractHash: string }> {
  const rpcClient = createRpcClient();
  const contractHash = await resolveContractHash(params.tokenContractHash);
  const dictionaryItemKey = makeBalanceDictionaryKey(params.ownerAccountHash);
  const balance = await getDictionaryValue(
    rpcClient,
    contractHash,
    DICT_BALANCES,
    dictionaryItemKey,
  );
  return { balance, contractHash };
}

export async function fetchCep18Allowance(params: {
  tokenContractHash: string;
  ownerAccountHash: string;
  spenderContractHash: string;
}): Promise<{ allowance: string; tokenContractHash: string; spenderContractHash: string }> {
  const rpcClient = createRpcClient();
  const tokenContractHash = await resolveContractHash(params.tokenContractHash);
  //const spenderContractHash = await resolveContractHash(params.spenderContractHash);
  const spenderContractHash = params.spenderContractHash;
  const dictionaryItemKey = makeAllowanceDictionaryKey({
    ownerAccountHash: params.ownerAccountHash,
    spenderContractHash,
  });
  const allowance = await getDictionaryValue(
    rpcClient,
    tokenContractHash,
    DICT_ALLOWANCES,
    dictionaryItemKey,
  );
  return { allowance, tokenContractHash, spenderContractHash };
}
