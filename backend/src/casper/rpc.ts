import { HttpHandler, RpcClient } from 'casper-js-sdk';
import { config } from '../config/config';

export function createRpcClient(): RpcClient {
  const handler = new HttpHandler(config.CSPR_RPC_URL);
  return new RpcClient(handler);
}
