import {
  Args,
  CLValue,
  ContractHash,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  RpcClient,
  StoredContractByHash,
} from 'casper-js-sdk';
import { config } from '../config/config';
import { createCasperSigner } from '../casper';
import { fetchCoinGeckoPrice } from './coingecko';
import { logger } from '../utils/logger';
import { toClKey } from '../utils/keys';

const WAD = 1_000_000_000_000_000_000n;

function toWad(value: number): string {
  return BigInt(Math.floor(value * 1_000_000_000)) * (WAD / 1_000_000_000n) + '';
}

export async function runOracleFeederOnce(): Promise<string[]> {
  const signer = await createCasperSigner();
  const assets = Object.entries(config.ASSET_ID_MAP);
  const deployHashes: string[] = [];

  for (const [symbol, meta] of assets) {
    const price = await fetchCoinGeckoPrice(meta.coingeckoId);
    const priceWad = toWad(price.priceUsd);
    logger.info({ symbol, priceUsd: price.priceUsd, priceWad }, 'oracle.price.fetched');
    const deployHash = await pushPriceOnChain(
      signer.rpcClient,
      signer.privateKey,
      meta.assetType,
      meta.assetHash,
      priceWad,
    );
    deployHashes.push(deployHash);
  }
  return deployHashes;
}

async function pushPriceOnChain(
  rpcClient: RpcClient,
  privateKey: import('casper-js-sdk').PrivateKey,
  assetType: import('../utils/keys').AssetKeyType,
  assetHash: string,
  priceWad: string,
): Promise<string> {
  const args = Args.fromMap({
    asset: toClKey(assetType, assetHash),
    price: CLValue.newCLUInt256(priceWad),
  });

  const header = DeployHeader.default();
  header.account = privateKey.publicKey;
  header.chainName = config.CASPER_NETWORK;

  const session = new ExecutableDeployItem();
  session.storedContractByHash = new StoredContractByHash(
    ContractHash.newContract(config.ORACLE_CONTRACT_HASH),
    'set_price',
    args,
  );

  const payment = ExecutableDeployItem.standardPayment(
    config.CASPER_GAS_PAYMENT?.toString() ?? '5000000000',
  );
  const deploy = Deploy.makeDeploy(header, payment, session);
  deploy.sign(privateKey);

  const result = await rpcClient.putDeploy(deploy);
  logger.info({ deployHash: result.deployHash }, 'oracle.price.pushed');
  //@ts-ignore
  return result.deployHash;
}
