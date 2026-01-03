import { Router } from 'express';
import { getLatestEvent, getLatestPrice, runOnce } from '../controllers/oracleController';

const router = Router();

router.get('/once', runOnce);
router.get('/events/latest', getLatestEvent);
router.get('/price/:symbol', getLatestPrice);

export default router;
