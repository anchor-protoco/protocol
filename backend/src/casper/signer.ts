import { KeyAlgorithm, PrivateKey } from 'casper-js-sdk';
import fs from 'fs';
import { config } from '../config/config';

function resolveAlgorithm(): KeyAlgorithm | null {
  if (!config.ORACLE_KEY_ALGORITHM) return null;
  return config.ORACLE_KEY_ALGORITHM === 'ed25519'
    ? KeyAlgorithm.ED25519
    : KeyAlgorithm.SECP256K1;
}

function loadFromPem(pem: string): PrivateKey {
  const explicit = resolveAlgorithm();
  if (explicit) {
    return PrivateKey.fromPem(pem, explicit);
  }
  try {
    return PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
  } catch {
    return PrivateKey.fromPem(pem, KeyAlgorithm.ED25519);
  }
}

function loadFromHex(hex: string): PrivateKey {
  const explicit = resolveAlgorithm();
  if (explicit) {
    return PrivateKey.fromHex(hex, explicit);
  }
  try {
    return PrivateKey.fromHex(hex, KeyAlgorithm.SECP256K1);
  } catch {
    return PrivateKey.fromHex(hex, KeyAlgorithm.ED25519);
  }
}

export async function loadOraclePrivateKey(): Promise<PrivateKey> {
  const pem = config.ORACLE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (pem.includes('BEGIN')) {
    return loadFromPem(pem);
  }
  if (fs.existsSync(pem)) {
    const filePem = fs.readFileSync(pem, 'utf8');
    return loadFromPem(filePem);
  }
  return loadFromHex(pem);
}
