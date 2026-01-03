import { Router } from 'express';
import {
  getMarketByAsset,
  listLatestPrices,
  listMarkets,
  listMarketSummaries,
  upsertMarketMetadata,
} from '../controllers/marketController';
import {
  getMarketParams,
  getMarketState,
  getMarketSummary,
} from '../controllers/marketStateController';
import { listMarketActivity } from '../controllers/marketActivityController';

const router = Router();

router.get('/', listMarkets);
router.get('/summary', listMarketSummaries);
router.get('/asset/:asset', getMarketByAsset);
router.get('/asset/:asset/state', getMarketState);
router.get('/asset/:asset/params', getMarketParams);
router.get('/asset/:asset/summary', getMarketSummary);
router.get('/asset/:asset/activity', listMarketActivity);
router.get('/prices/latest', listLatestPrices);
router.post('/metadata', upsertMarketMetadata);

export default router;
