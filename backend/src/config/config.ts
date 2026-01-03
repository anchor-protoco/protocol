import { readFileSync } from 'fs';
import { z } from 'zod';
import { defaultAssetMap } from './assets';

const rawHashSchema = z.string().regex(/^[0-9a-f]{64}$/i);

const normalizeHex = z.string().transform((value, ctx) => {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!rawHashSchema.safeParse(normalized).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a 64-char hex string with optional 0x prefix',
    });
    return z.NEVER;
  }
  return normalized;
});

const hashListSchema = z.string().transform((value, ctx) => {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const normalized = parts.map((part) => (part.startsWith('0x') ? part.slice(2) : part));
  for (const item of normalized) {
    if (!rawHashSchema.safeParse(item).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a comma-separated list of 64-char hex strings',
      });
      return z.NEVER;
    }
  }
  return normalized;
});

const assetTypeSchema = z.enum(['contract-package', 'contract', 'hash', 'account-hash']);

const assetMapSchema = z.record(
  z.string().min(1),
  z.object({
    coingeckoId: z.string().min(1),
    assetHash: normalizeHex,
    assetType: assetTypeSchema.default('hash'),
  }),
);

const schema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    COINGECKO_BASE_URL: z.string().url(),
    ORACLE_UPDATE_INTERVAL_MS: z.coerce.number().int().positive(),
    ORACLE_CONTRACT_PACKAGE_HASH: normalizeHex,
    ORACLE_CONTRACT_HASH: normalizeHex,
    ORACLE_ADMIN_PRIVATE_KEY: z.string().min(1),
    ORACLE_KEY_ALGORITHM: z.enum(['secp256k1', 'ed25519']).optional(),
    CASPER_NETWORK: z.string().min(1),
    CSPR_RPC_URL: z.string().url(),
    CSPR_WSS_URL: z.string().min(1).optional(),
    CSPR_CLOUD_STREAMING_URL: z.string().min(1).optional(),
    CSPR_CLOUD_ACCESS_KEY: z.string().optional(),
    CASPER_GAS_PAYMENT: z.coerce.number().int().positive().optional(),
    EVENT_CONTRACT_PACKAGE_HASHES: hashListSchema.optional(),
    ASSET_ID_MAP: z.string().min(2).optional(),
    ASSET_ID_MAP_PATH: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.CSPR_WSS_URL && !data.CSPR_CLOUD_STREAMING_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CSPR_WSS_URL or CSPR_CLOUD_STREAMING_URL must be set',
        path: ['CSPR_WSS_URL'],
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

let assetMapValue: unknown;
if (parsed.data.ASSET_ID_MAP) {
  assetMapValue = JSON.parse(parsed.data.ASSET_ID_MAP);
} else if (parsed.data.ASSET_ID_MAP_PATH) {
  const content = readFileSync(parsed.data.ASSET_ID_MAP_PATH, 'utf8');
  assetMapValue = JSON.parse(content);
} else {
  assetMapValue = defaultAssetMap;
}

const assetMapParsed = assetMapSchema.safeParse(assetMapValue);
if (!assetMapParsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid ASSET_ID_MAP', assetMapParsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  ASSET_ID_MAP: assetMapParsed.data,
  CSPR_WSS_URL: parsed.data.CSPR_WSS_URL ?? parsed.data.CSPR_CLOUD_STREAMING_URL!,
  ORACLE_CONTRACT_PACKAGE_KEY: `contract-package-${parsed.data.ORACLE_CONTRACT_PACKAGE_HASH}`,
  EVENT_CONTRACT_PACKAGE_HASHES:
    parsed.data.EVENT_CONTRACT_PACKAGE_HASHES ?? [parsed.data.ORACLE_CONTRACT_PACKAGE_HASH],
};
