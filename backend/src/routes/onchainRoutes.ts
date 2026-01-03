import { Router } from 'express';
import {
  callMarketGetter,
  getContract,
  getContractPackage,
  getMarketGetters,
  getMarketOnchain,
} from '../controllers/onchainController';

const router = Router();

router.get('/contract-package/:hash', getContractPackage);
router.get('/contract/:hash', getContract);
router.get('/market/:asset', getMarketOnchain);
router.get('/market/:asset/getters', getMarketGetters);
router.get('/market/:asset/call/:entrypoint', callMarketGetter);

export default router;
