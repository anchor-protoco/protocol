import { config } from '../config/config';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { runOracleFeederOnce } from './feeder';

let intervalHandle: NodeJS.Timeout | null = null;
let isRunning = false;

async function runCycle(): Promise<void> {
  if (isRunning) {
    logger.warn({ reason: 'previous_run_in_progress' }, 'oracle.scheduler.skipped');
    return;
  }

  isRunning = true;
  try {
    const deployHashes = await withRetry(runOracleFeederOnce, 2, 1_000);
    logger.info({ deployHashes }, 'oracle.scheduler.cycle_complete');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'oracle.scheduler.cycle_failed');
  } finally {
    isRunning = false;
  }
}

export function startOracleScheduler(): void {
  if (intervalHandle) return;
  const intervalMs = config.ORACLE_UPDATE_INTERVAL_MS;
  logger.info({ intervalMs }, 'oracle.scheduler.start');
  void runCycle();
  intervalHandle = setInterval(() => {
    void runCycle();
  }, intervalMs);
}

export function stopOracleScheduler(): void {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
  logger.info({}, 'oracle.scheduler.stop');
}
