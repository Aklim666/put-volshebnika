import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import archetypeRouter from "./archetype";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(archetypeRouter);

export default router;
