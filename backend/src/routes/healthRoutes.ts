import { Router } from 'express';
import { getEventHealth } from '../controllers/healthController';

const router = Router();

router.get('/events', getEventHealth);

export default router;
