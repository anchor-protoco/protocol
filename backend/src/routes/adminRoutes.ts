import { Router } from 'express';
import { backfillMarket } from '../controllers/adminController';

const router = Router();

router.post('/markets/backfill', backfillMarket);

export default router;
