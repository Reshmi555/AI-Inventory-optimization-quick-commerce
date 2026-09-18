import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supplyChainRouter from "./supplyChain";

const router: IRouter = Router();

router.use(healthRouter);
router.use(supplyChainRouter);

export default router;
