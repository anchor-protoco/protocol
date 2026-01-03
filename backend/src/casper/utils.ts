import { byteHash, CLValue, Hash, Key, PublicKey } from 'casper-js-sdk';

const HASH_PREFIXES = [
  'hash-',
  'contract-',
  'contract-package-',
  'contract-package-wasm-',
  'account-hash-',
  'package-',
];

export function normalizeHashHex(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const withoutPrefix = HASH_PREFIXES.reduce(
    (acc, prefix) => (acc.startsWith(prefix) ? acc.slice(prefix.length) : acc),
    trimmed,
  );
  return withoutPrefix.startsWith('0x') ? withoutPrefix.slice(2) : withoutPrefix;
}

export function normalizeAccountHashOrPublicKey(value: string): string {
  const normalized = normalizeHashHex(value);
  if (normalized.length === 64) {
    return normalized;
  }
  try {
    const pk = PublicKey.fromHex(normalized);
    const accountHash = pk.accountHash();
    if (typeof accountHash.toHex === 'function') {
      return accountHash.toHex();
    }
    if (typeof accountHash.toPrefixedString === 'function') {
      return normalizeHashHex(accountHash.toPrefixedString());
    }
    if (typeof accountHash.toString === 'function') {
      return normalizeHashHex(accountHash.toString());
    }
  } catch {
    // Fall through to return the normalized input.
  }
  return normalized;
}

export function accountKeyFromAccountHash(accountHashHex: string): Key {
  const normalized = normalizeHashHex(accountHashHex);
  return Key.newKey(`account-hash-${normalized}`);
}

export function contractKeyFromHash(contractHashHex: string): Key {
  const normalized = normalizeHashHex(contractHashHex);
  return Key.newKey(`hash-${normalized}`);
}

export function makeBalanceDictionaryKey(accountHashHex: string): string {
  const keyBytes = accountKeyFromAccountHash(accountHashHex).bytes();
  return Buffer.from(keyBytes).toString('base64');
}

export function makeAllowanceDictionaryKey(params: {
  ownerAccountHash: string;
  spenderContractHash: string;
}): string {
  const ownerBytes = accountKeyFromAccountHash(params.ownerAccountHash).bytes();
  const spenderBytes = contractKeyFromHash(params.spenderContractHash).bytes();
  const combined = new Uint8Array(ownerBytes.length + spenderBytes.length);
  combined.set(ownerBytes, 0);
  combined.set(spenderBytes, ownerBytes.length);
  return Buffer.from(byteHash(combined)).toString('hex');
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
