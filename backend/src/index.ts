import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import { config } from './config/config';
import oracleRoutes from './routes/oracleRoutes';
import marketRoutes from './routes/marketRoutes';
import activityRoutes from './routes/activityRoutes';
import adminRoutes from './routes/adminRoutes';
import healthRoutes from './routes/healthRoutes';
import onchainRoutes from './routes/onchainRoutes';
import tokenRoutes from './routes/tokenRoutes';
import { errorHandler } from './middleware/errorHandler';
import { startContractEventStream } from './events/contractEvents';
import { startOracleScheduler } from './oracle/scheduler';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/v1/oracle', oracleRoutes);
app.use('/api/v1/markets', marketRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/onchain', onchainRoutes);
app.use('/api/v1/token', tokenRoutes);
app.use(errorHandler);

startContractEventStream();
startOracleScheduler();

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Anchor backend listening on ${config.PORT}`);
});
