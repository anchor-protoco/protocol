import { HttpHandler, RpcClient } from 'casper-js-sdk';
import { config } from '../config/config';
import { normalizeKeyHex } from '../utils/keys';

let rpcClient: RpcClient | null = null;

function getRpcClient(): RpcClient {
  if (!rpcClient) {
    const handler = new HttpHandler(config.CSPR_RPC_URL);
    rpcClient = new RpcClient(handler);
  }
  return rpcClient;
}

function withPrefix(prefix: string, value: string): string {
  return `${prefix}-${normalizeKeyHex(value)}`;
}

async function queryWithFallback(hash: string, prefixes: string[]) {
  const rpc = getRpcClient();
  let lastError: unknown = null;
  for (const prefix of prefixes) {
    try {
      const key = withPrefix(prefix, hash);
      const result = await rpc.queryLatestGlobalState(key, []);
      return { key, result };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function queryContractPackage(hash: string) {
  return queryWithFallback(hash, ['contract-package', 'hash']);
}

export async function queryContract(hash: string) {
  const rpc = getRpcClient();
  const key = withPrefix('hash', hash);
  const result = await rpc.queryLatestGlobalState(key, []);
  return { key, result };
}
