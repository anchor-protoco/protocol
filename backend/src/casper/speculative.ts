import {
  Args,
  CLValue,
  ContractHash,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  HttpHandler,
  SpeculativeClient,
  StoredContractByHash,
} from 'casper-js-sdk';
import { config } from '../config/config';
import { createCasperSigner } from './index';

export type SpeculativeCallResult = {
  raw: unknown;
  clValue?: unknown;
  clValueString?: string;
};

function extractWriteCLValue(result: any): { clValue?: CLValue } {
  const effects = result?.executionResult?.effects;
  if (!Array.isArray(effects)) return {};
  for (const effect of effects) {
    const kind = effect.kind ?? effect.transform;
    if (!kind) continue;
    const isWrite =
      (typeof kind.isWriteCLValue === 'function' && kind.isWriteCLValue()) ||
      (typeof kind.isCLValueWrite === 'function' && kind.isCLValueWrite()) ||
      (typeof kind.isTransformation === 'function' && kind.isTransformation('WriteCLValue'));
    if (!isWrite) continue;
    if (typeof kind.parseAsWriteCLValue === 'function') {
      const clValue = kind.parseAsWriteCLValue();
      return { clValue };
    }
  }
  return {};
}

export async function speculativeCall(
  contractHash: string,
  entryPoint: string,
  args: Record<string, CLValue> = {},
): Promise<SpeculativeCallResult> {
  const { privateKey } = await createCasperSigner();
  const handler = new HttpHandler(config.CSPR_RPC_URL);
  const speculative = new SpeculativeClient(handler);

  const header = DeployHeader.default();
  header.account = privateKey.publicKey;
  header.chainName = config.CASPER_NETWORK;

  const session = new ExecutableDeployItem();
  session.storedContractByHash = new StoredContractByHash(
    ContractHash.newContract(contractHash),
    entryPoint,
    Args.fromMap(args),
  );

  const payment = ExecutableDeployItem.standardPayment(
    config.CASPER_GAS_PAYMENT?.toString() ?? '100000000',
  );
  const deploy = Deploy.makeDeploy(header, payment, session);
  deploy.sign(privateKey);

  const raw = await speculative.speculativeExec(Date.now().toString(), deploy);
  const parsed = extractWriteCLValue(raw);
  const clValueJson = parsed.clValue ? parsed.clValue.toJSON() : undefined;
  const clValueString = parsed.clValue ? parsed.clValue.toString() : undefined;

  return {
    raw,
    clValue: clValueJson,
    clValueString,
  };
}
