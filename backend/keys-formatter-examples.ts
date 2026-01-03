import { byteHash, CLValue, Hash, Key, PublicKey } from 'casper-js-sdk';

const HASH_PREFIXES = [
  'hash-',
  'contract-',
  'contract-package-',
  'contract-package-wasm-',
  'account-hash-',
  'package-',
];

export function clAddressFromAccountHash(accountHashHex: string) {
  const clean = accountHashHex.startsWith('0x') ? accountHashHex.slice(2) : accountHashHex;
  if (clean.length !== 64) {
    throw new Error('accountHash must be 32 bytes hex');
  }
  const hashBytes = Hash.fromHex(clean).toBytes();
  const keyBytes = new Uint8Array(1 + hashBytes.length);
  keyBytes[0] = 0x00; // Account
  keyBytes.set(hashBytes, 1);
  const key = Key.fromBytes(keyBytes).result;
  return CLValue.newCLKey(key);
}

export function clAddressFromContractHash(contractHashHex: string) {
  const hashBytes = Hash.fromHex(contractHashHex).toBytes();

  const keyBytes = new Uint8Array(1 + hashBytes.length);
  keyBytes[0] = 0x01; // Contract tag
  keyBytes.set(hashBytes, 1);

  const key = Key.fromBytes(keyBytes).result;

  return CLValue.newCLKey(key);
}

export function toTokenUnits(amount: string, decimals: number): bigint {
  return BigInt(amount) * BigInt(10 ** decimals);
}

export function clAddressFromPublicKey(pkHex: string) {
  const pk = PublicKey.fromHex(pkHex);

  // Raw 32-byte account hash (NO tag)
  const hashBytes = pk.accountHash().toBytes();

  // Prepend Account tag (0x00)
  const keyBytes = new Uint8Array(1 + hashBytes.length);
  keyBytes[0] = 0x00; // Account
  keyBytes.set(hashBytes, 1);

  const key = Key.fromBytes(keyBytes).result;

  return CLValue.newCLKey(key);
}
