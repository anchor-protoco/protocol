import { Router } from 'express';
import {
  getAccountPosition,
  getAccountPositions,
  listAccountActivity,
  listRecentActivity,
} from '../controllers/activityController';

const router = Router();

router.get('/recent', listRecentActivity);
router.get('/account/:account', listAccountActivity);
router.get('/account/:account/position', getAccountPosition);
router.get('/account/:account/positions', getAccountPositions);

export default router;
