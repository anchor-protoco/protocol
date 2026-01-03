import { CLValue, Key } from 'casper-js-sdk';

export type AssetKeyType = 'contract-package' | 'contract' | 'hash' | 'account-hash';

function normalizeHex(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

export function normalizeKeyHex(value: string): string {
  const clean = normalizeHex(value);
  if (clean.startsWith('account-hash-')) return clean.slice('account-hash-'.length);
  if (clean.startsWith('hash-')) return clean.slice('hash-'.length);
  if (clean.startsWith('contract-')) return clean.slice('contract-'.length);
  if (clean.startsWith('contract-package-')) return clean.slice('contract-package-'.length);
  return clean;
}

export function toKey(type: AssetKeyType, hex: string): Key {
  const clean = normalizeHex(hex);
  switch (type) {
    case 'hash':
    case 'contract':
      return Key.newKey(`hash-${clean}`);
    case 'account-hash':
      return Key.newKey(`account-hash-${clean}`);
    case 'contract-package':
      throw new Error('contract-package is not a valid Address/Key type for Odra Address');
    default:
      throw new Error(`Unsupported key type: ${type}`);
  }
}

export function toClKey(type: AssetKeyType, hex: string): CLValue {
  return CLValue.newCLKey(toKey(type, hex));
}
