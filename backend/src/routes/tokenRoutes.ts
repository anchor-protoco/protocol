import { Router } from 'express';
import { getCasperTokenAllowance } from '../controllers/getCasperTokenAllowance';
import { getCasperTokenBalance } from '../controllers/getCasperTokenBlance';

const router = Router();

router.get('/balance', getCasperTokenBalance);
router.get('/allowance', getCasperTokenAllowance);

export default router;
