import { PublicKey, PrivateKey, RpcClient } from 'casper-js-sdk';
import { createRpcClient } from './rpc';
import { loadOraclePrivateKey } from './signer';

export interface CasperSignerContext {
  privateKey: PrivateKey;
  publicKey: PublicKey;
  rpcClient: RpcClient;
}

export async function createCasperSigner(): Promise<CasperSignerContext> {
  const privateKey = await loadOraclePrivateKey();
  const publicKey = privateKey.publicKey;
  const rpcClient = createRpcClient();

  return { privateKey, publicKey, rpcClient };
}
