import { z } from 'zod';

const casperConfigSchema = z.object({
CASPER_NETWORK: z.enum(['casper-test', 'casper-mainnet']),

// CSPR.cloud
CSPR_CLOUD_URL: z.string().url(),
CSPR_CLOUD_STREAMING_URL: z.string().url(),
CSPR_CLOUD_ACCESS_KEY: z.string().min(1),
CASPER_RPC_URL: z.string().url(),
CASPER_CHAIN_NAME: z.string().min(1),
CASPER_GAS_PAYMENT: z.string(),

// Relayer key (PEM or base64)
CASPER_RELAYER_PRIVATE_KEY: z.string().min(1),

// BridgeCore
CASPER_BRIDGE_CORE_HASH: z.string().min(1),
CASPER_BRIDGE_CORE_CONTRACT_PACKAGE_HASH: z.string().min(1),

// Backfill
CASPER_DEPLOY_START_HEIGHT: z.number(),
CASPER_REORG_BUFFER: z.number(),

// filter target (use ONE of them, but package hash is recommended)

CASPER_CONTRACT_PACKAGE_HASH: z.string().min(1).optional(),
PING_CHECK_INTERVAL_IN_MILLSECCONDS: z.number(),
});

export type CasperConfig = z.infer<typeof casperConfigSchema>;

export function loadCasperConfig(): CasperConfig {
const parsed = casperConfigSchema.safeParse({
CASPER_NETWORK: process.env.CASPER_NETWORK,
CASPER_GAS_PAYMENT: process.env.CASPER_GAS_PAYMENT,
CSPR_CLOUD_URL: process.env.CSPR_CLOUD_URL,
CSPR_CLOUD_STREAMING_URL: process.env.CSPR_CLOUD_STREAMING_URL,
CSPR_CLOUD_ACCESS_KEY: process.env.CSPR_CLOUD_ACCESS_KEY,
CASPER_RPC_URL: process.env.CASPER_RPC_URL,
CASPER_CHAIN_NAME: process.env.CASPER_CHAIN_NAME,
CASPER_BRIDGE_CORE_CONTRACT_PACKAGE_HASH:
process.env.CASPER_BRIDGE_CORE_CONTRACT_PACKAGE_HASH,

    CASPER_RELAYER_PRIVATE_KEY: process.env.CASPER_RELAYER_PRIVATE_KEY,

    CASPER_BRIDGE_CORE_HASH: process.env.CASPER_BRIDGE_CORE_HASH,

    CASPER_DEPLOY_START_HEIGHT: Number(
      process.env.CASPER_DEPLOY_START_HEIGHT ?? 0,
    ),
    CASPER_REORG_BUFFER: Number(process.env.CASPER_REORG_BUFFER ?? 2),
    PING_CHECK_INTERVAL_IN_MILLSECCONDS: 60000,
    // filter target (use ONE of them, but package hash is recommended)
    CASPER_CONTRACT_PACKAGE_HASH: process.env.CASPER_CONTRACT_PACKAGE_HASH,

});

if (!parsed.success) {
console.error('❌ Invalid Casper config', parsed.error.format());
throw new Error('Invalid Casper configuration');
}

const cfg = parsed.data;

// enforce exactly one filter set
const hasHash = !!cfg.CASPER_BRIDGE_CORE_HASH;
const hasPkg = !!cfg.CASPER_CONTRACT_PACKAGE_HASH;
if (Number(hasHash) + Number(hasPkg) !== 1) {
throw new Error(
'Set exactly one of CASPER_BRIDGE_CORE_HASH or CASPER_CONTRACT_PACKAGE_HASH',
);
}

return cfg;
}
