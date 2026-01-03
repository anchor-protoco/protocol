import WebSocket, { type RawData } from 'ws';
import { config } from '../config/config';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { normalizeKeyHex } from '../utils/keys';

const RECONNECT_DELAY_MS = 5_000;

function buildContractEventsUrl(): string {
  const base = config.CSPR_WSS_URL;
  const baseUrl = base.includes('/contract-events')
    ? base
    : `${base.replace(/\/$/, '')}/contract-events`;
  const params: string[] = [];

  if (config.EVENT_CONTRACT_PACKAGE_HASHES.length > 0) {
    params.push(`contract_package_hash=${config.EVENT_CONTRACT_PACKAGE_HASHES.join(',')}`);
  }
  params.push('includes=raw_data');

  return `${baseUrl}?${params.join('&')}`;
}

function createCasperEventStream(): WebSocket {
  const url = buildContractEventsUrl();
  const headers: Record<string, string> = {};
  if (config.CSPR_CLOUD_ACCESS_KEY) {
    headers.authorization = config.CSPR_CLOUD_ACCESS_KEY;
  }
  return new WebSocket(url, { headers });
}

let reconnectTimer: NodeJS.Timeout | null = null;

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startContractEventStream();
  }, RECONNECT_DELAY_MS);
}

export function startContractEventStream(): void {
  const ws = createCasperEventStream();
  const url = buildContractEventsUrl();

  ws.on('open', () => {
    logger.info({ url }, 'events.ws.open');
  });

  ws.on('message', async (data: RawData) => {
    const text = typeof data === 'string' ? data : data.toString('utf8');
    if (text === 'Ping' || text === 'Pong') return;
    try {
      const payload = JSON.parse(text) as {
        action?: string;
        data?: {
          contract_package_hash?: string;
          name?: string;
          data?: unknown;
        };
        extra?: {
          deploy_hash?: string;
          block_hash?: string;
        };
      };

      if (payload.action !== 'emitted' || !payload.data) return;

      const contractPackageHash = payload.data.contract_package_hash ?? '';
      const deployHash = payload.extra?.deploy_hash ?? '';
      const blockHash = payload.extra?.block_hash ?? '';

      await prisma.contractEvent.create({
        data: {
          contract: contractPackageHash,
          eventType: payload.data.name ?? '',
          payloadJson: JSON.stringify(payload.data.data ?? null),
          deployHash,
          blockHash,
        },
      });

      await persistNormalizedEvent(
        payload.data.name ?? '',
        payload.data.data ?? null,
        contractPackageHash,
        deployHash,
        blockHash,
      );
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'events.ws.parse_failed');
    }
  });

  ws.on('error', (error: Error) => {
    logger.error({ error: error.message }, 'events.ws.error');
  });

  ws.on('close', (code: number, reason: Buffer) => {
    logger.warn({ code, reason: reason.toString() }, 'events.ws.closed');
    scheduleReconnect();
  });
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Math.trunc(value).toString();
  if (typeof value === 'bigint') return value.toString();
  return null;
}

function asNormalizedKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return normalizeKeyHex(value);
}

function asBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

async function persistNormalizedEvent(
  eventType: string,
  data: unknown,
  contractPackageHash: string,
  deployHash: string,
  blockHash: string,
): Promise<void> {
  if (!data || typeof data !== 'object') return;
  const payload = data as Record<string, unknown>;

  switch (eventType) {
    case 'PriceUpdated': {
      const asset = asNormalizedKey(payload.asset);
      const priceWad = asString(payload.price);
      const timestamp = asString(payload.timestamp);
      if (!asset || !priceWad) return;
      await prisma.priceUpdateEvent.create({
        data: {
          contractPackageHash,
          asset,
          priceWad,
          eventTimestamp: timestamp ? BigInt(timestamp) : null,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'MarketRegistered': {
      const asset = asNormalizedKey(payload.asset);
      const market = asNormalizedKey(payload.market);
      const aToken = asNormalizedKey(payload.a_token);
      const oracle = asNormalizedKey(payload.oracle);
      if (!asset || !market || !aToken || !oracle) return;
      await prisma.marketRegisteredEvent.create({
        data: {
          contractPackageHash,
          asset,
          market,
          aToken,
          oracle,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'MarketActiveUpdated': {
      const asset = asNormalizedKey(payload.asset);
      const isActive = asBool(payload.is_active);
      if (!asset || isActive === null) return;
      await prisma.marketActiveUpdatedEvent.create({
        data: {
          contractPackageHash,
          asset,
          isActive,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'PauseFlagsUpdated': {
      const asset = asNormalizedKey(payload.asset);
      const supplyPaused = asBool(payload.supply_paused);
      const borrowPaused = asBool(payload.borrow_paused);
      const withdrawPaused = asBool(payload.withdraw_paused);
      const repayPaused = asBool(payload.repay_paused);
      const liquidationPaused = asBool(payload.liquidation_paused);
      if (
        !asset ||
        supplyPaused === null ||
        borrowPaused === null ||
        withdrawPaused === null ||
        repayPaused === null ||
        liquidationPaused === null
      )
        return;
      await prisma.pauseFlagsUpdatedEvent.create({
        data: {
          contractPackageHash,
          asset,
          supplyPaused,
          borrowPaused,
          withdrawPaused,
          repayPaused,
          liquidationPaused,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'RateModelUpdated': {
      const baseRatePerSec = asString(payload.base_rate_per_sec);
      const slopeRatePerSec = asString(payload.slope_rate_per_sec);
      if (!baseRatePerSec || !slopeRatePerSec) return;
      await prisma.rateModelUpdatedEvent.create({
        data: {
          contractPackageHash,
          baseRatePerSec,
          slopeRatePerSec,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'RiskParamsUpdated': {
      const collateralFactor = asString(payload.collateral_factor);
      const liquidationThreshold = asString(payload.liquidation_threshold);
      const closeFactor = asString(payload.close_factor);
      const liquidationBonus = asString(payload.liquidation_bonus);
      const reserveFactor = asString(payload.reserve_factor);
      const borrowCap = asString(payload.borrow_cap);
      const supplyCap = asString(payload.supply_cap);
      if (
        !collateralFactor ||
        !liquidationThreshold ||
        !closeFactor ||
        !liquidationBonus ||
        !reserveFactor ||
        !borrowCap ||
        !supplyCap
      )
        return;
      await prisma.riskParamsUpdatedEvent.create({
        data: {
          contractPackageHash,
          collateralFactor,
          liquidationThreshold,
          closeFactor,
          liquidationBonus,
          reserveFactor,
          borrowCap,
          supplyCap,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'MarketStateUpdated': {
      const cash = asString(payload.cash);
      const totalBorrows = asString(payload.total_borrows);
      const totalReserves = asString(payload.total_reserves);
      const supplyIndex = asString(payload.supply_index);
      const borrowIndex = asString(payload.borrow_index);
      const utilization = asString(payload.utilization);
      const supplyRatePerSec = asString(payload.supply_rate_per_sec);
      const borrowRatePerSec = asString(payload.borrow_rate_per_sec);
      const timestamp = asString(payload.timestamp);
      if (
        !cash ||
        !totalBorrows ||
        !totalReserves ||
        !supplyIndex ||
        !borrowIndex ||
        !utilization ||
        !supplyRatePerSec ||
        !borrowRatePerSec
      )
        return;
      await prisma.marketStateUpdatedEvent.create({
        data: {
          contractPackageHash,
          cash,
          totalBorrows,
          totalReserves,
          supplyIndex,
          borrowIndex,
          utilization,
          supplyRatePerSec,
          borrowRatePerSec,
          eventTimestamp: timestamp ? BigInt(timestamp) : null,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'Deposit': {
      const account = asNormalizedKey(payload.account);
      const amount = asString(payload.amount);
      if (!account || !amount) return;
      await prisma.depositEvent.create({
        data: {
          contractPackageHash,
          account,
          amount,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'Withdraw': {
      const account = asNormalizedKey(payload.account);
      const amount = asString(payload.amount);
      if (!account || !amount) return;
      await prisma.withdrawEvent.create({
        data: {
          contractPackageHash,
          account,
          amount,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'Borrow': {
      const account = asNormalizedKey(payload.account);
      const amount = asString(payload.amount);
      if (!account || !amount) return;
      await prisma.borrowEvent.create({
        data: {
          contractPackageHash,
          account,
          amount,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'Repay': {
      const account = asNormalizedKey(payload.account);
      const amount = asString(payload.amount);
      if (!account || !amount) return;
      await prisma.repayEvent.create({
        data: {
          contractPackageHash,
          account,
          amount,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    case 'Liquidate': {
      const borrower = asNormalizedKey(payload.borrower);
      const liquidator = asNormalizedKey(payload.liquidator);
      const repayAmount = asString(payload.repay_amount);
      const seizeAmount = asString(payload.seize_amount);
      if (!borrower || !liquidator || !repayAmount || !seizeAmount) return;
      await prisma.liquidateEvent.create({
        data: {
          contractPackageHash,
          borrower,
          liquidator,
          repayAmount,
          seizeAmount,
          deployHash,
          blockHash,
        },
      });
      return;
    }
    default:
      return;
  }
}
