import { Router, type IRouter } from "express";
import {
  AskSupplyChainAnalystBody,
  AskSupplyChainAnalystResponse,
  GetSupplyChainDriversResponse,
  GetSupplyChainForecastsQueryParams,
  GetSupplyChainForecastsResponse,
  GetSupplyChainOverviewResponse,
  GetSupplyChainPoliciesResponse,
  GetSupplyChainRisksQueryParams,
  GetSupplyChainRisksResponse,
  GetSupplyChainScenarioQueryParams,
  GetSupplyChainScenarioResponse,
} from "@workspace/api-zod";
import {
  answerAnalystQuestion,
  getDrivers,
  getForecasts,
  getOverview,
  getPolicies,
  getRisks,
  getScenario,
} from "../lib/supplyChainData";

const router: IRouter = Router();

router.get("/supply-chain/overview", (_req, res): void => {
  res.json(GetSupplyChainOverviewResponse.parse(getOverview()));
});

router.get("/supply-chain/forecasts", (req, res): void => {
  const parsed = GetSupplyChainForecastsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(GetSupplyChainForecastsResponse.parse(
    getForecasts(parsed.data.storeId, parsed.data.productId),
  ));
});

router.get("/supply-chain/risks", (req, res): void => {
  const parsed = GetSupplyChainRisksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(GetSupplyChainRisksResponse.parse(
    getRisks(parsed.data.level, parsed.data.storeId, parsed.data.productId, parsed.data.limit),
  ));
});

router.get("/supply-chain/policies", (_req, res): void => {
  res.json(GetSupplyChainPoliciesResponse.parse(getPolicies()));
});

router.get("/supply-chain/drivers", (_req, res): void => {
  res.json(GetSupplyChainDriversResponse.parse(getDrivers()));
});

router.get("/supply-chain/scenarios", (req, res): void => {
  const parsed = GetSupplyChainScenarioQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scenario = getScenario(parsed.data.dimension, parsed.data.value);
  if (!scenario) {
    res.status(404).json({ error: "That stored scenario value is unavailable." });
    return;
  }
  res.json(GetSupplyChainScenarioResponse.parse(scenario));
});

router.post("/supply-chain/analyst", (req, res): void => {
  const parsed = AskSupplyChainAnalystBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(AskSupplyChainAnalystResponse.parse(answerAnalystQuestion(parsed.data.question)));
});

export default router;