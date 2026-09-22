import fs from "node:fs";
import path from "node:path";

type CsvRow = Record<string, string>;
type AnyRow = Record<string, unknown>;

const serviceDataDir = path.resolve(process.cwd(), "data/supply-chain");
const workspaceDataDir = path.resolve(
  process.cwd(),
  "artifacts/api-server/data/supply-chain",
);
const DATA_DIR = fs.existsSync(serviceDataDir) ? serviceDataDir : workspaceDataDir;

const csvCache = new Map<string, CsvRow[]>();

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function csv(name: string): CsvRow[] {
  const cached = csvCache.get(name);
  if (cached) return cached;
  const file = path.join(DATA_DIR, name);
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  csvCache.set(name, rows);
  return rows;
}

function numberValue(row: CsvRow, key: string): number {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
}

function stringValue(row: CsvRow, key: string): string {
  return row[key] ?? "";
}

function booleanValue(row: CsvRow, key: string): boolean {
  return ["true", "1", "yes"].includes((row[key] ?? "").toLowerCase());
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function uniqueNumbers(rows: CsvRow[], key: string): number[] {
  return [...new Set(rows.map((row) => numberValue(row, key)))].sort((a, b) => a - b);
}

export function getForecasts(storeId?: number, productId?: number) {
  return csv("demand_forecasts_eval.csv")
    .filter((row) => (storeId === undefined || numberValue(row, "store_id") === storeId) &&
      (productId === undefined || numberValue(row, "product_id") === productId))
    .map((row) => ({
      storeId: numberValue(row, "store_id"),
      productId: numberValue(row, "product_id"),
      date: stringValue(row, "forecast_date"),
      forecastDemand: numberValue(row, "forecast_demand"),
      observedDemand: numberValue(row, "evaluation_observed_sale_amount"),
      forecastLower: numberValue(row, "forecast_lower"),
      forecastUpper: numberValue(row, "forecast_upper"),
      observedStockout: booleanValue(row, "evaluation_observed_stockout_flag"),
      recentObservedDemand7d: numberValue(row, "recent_observed_demand_7d"),
      recentStockoutRate7d: numberValue(row, "recent_stockout_rate_7d"),
      keyDrivers: stringValue(row, "key_drivers"),
    }));
}

export function getRisks(
  level?: string,
  storeId?: number,
  productId?: number,
  limit = 1000,
) {
  const rows = csv("supply_chain_risk_exceptions.csv").filter((row) =>
    (level === undefined || stringValue(row, "overall_risk_level") === level) &&
    (storeId === undefined || numberValue(row, "store_id") === storeId) &&
    (productId === undefined || numberValue(row, "product_id") === productId),
  );

  return {
    total: rows.length,
    records: rows.slice(0, limit).map((row) => ({
      storeId: numberValue(row, "store_id"),
      productId: numberValue(row, "product_id"),
      assessmentDate: stringValue(row, "risk_assessment_date"),
      forecastDemand: numberValue(row, "forecast_demand"),
      referenceDailyDemand: numberValue(row, "reference_daily_demand"),
      currentSimulatedInventory: numberValue(row, "current_simulated_inventory"),
      inventoryCoverageDays: numberValue(row, "inventory_coverage_days"),
      leadTimeDays: Math.round(numberValue(row, "lead_time_days")),
      reviewPeriodDays: Math.round(numberValue(row, "review_period_days")),
      shelfLifeDays: Math.round(numberValue(row, "shelf_life_days")),
      replenishmentQuantity: numberValue(row, "replenishment_quantity"),
      simulatedStockoutQuantity: numberValue(row, "simulated_stockout_quantity"),
      stockoutRisk: numberValue(row, "stockout_risk"),
      excessInventoryIndicator: booleanValue(row, "excess_inventory_indicator"),
      excessInventoryQuantity: numberValue(row, "excess_inventory_quantity"),
      excessInventoryRisk: numberValue(row, "excess_inventory_risk"),
      estimatedSpoilageExposure: numberValue(row, "estimated_spoilage_exposure"),
      potentialSpoilageRisk: numberValue(row, "potential_spoilage_risk"),
      demandSpikeRisk: numberValue(row, "demand_spike_risk"),
      forecastUncertaintyRisk: numberValue(row, "forecast_uncertainty_risk"),
      replenishmentUrgency: numberValue(row, "replenishment_urgency"),
      overallRiskScore: numberValue(row, "overall_risk_score"),
      overallRiskLevel: stringValue(row, "overall_risk_level"),
      primaryReason: stringValue(row, "primary_reason"),
      contributingFactors: stringValue(row, "contributing_factors"),
    })),
  };
}

function policyRows() {
  return csv("forecast_inventory_policy_comparison.csv").map((row) => ({
    policy: stringValue(row, "policy"),
    policyLabel: stringValue(row, "policy_label"),
    simulationStart: stringValue(row, "simulation_start"),
    simulationEnd: stringValue(row, "simulation_end"),
    stockoutQuantity: numberValue(row, "stockout_quantity"),
    serviceLevelProxy: numberValue(row, "service_level_proxy"),
    totalInventoryRelatedCost: numberValue(row, "total_inventory_related_cost"),
    orderCount: Math.round(numberValue(row, "order_count")),
    replenishmentQuantity: numberValue(row, "replenishment_quantity"),
    estimatedSpoilage: numberValue(row, "estimated_spoilage"),
    excessInventory: numberValue(row, "excess_inventory"),
    orderingCost: numberValue(row, "ordering_cost"),
    holdingCost: numberValue(row, "holding_cost"),
    stockoutLostSalesCost: numberValue(row, "stockout_lost_sales_cost"),
    spoilageCost: numberValue(row, "spoilage_cost"),
    records: Math.round(numberValue(row, "records")),
    keys: Math.round(numberValue(row, "keys")),
    observedStockoutFrequency: numberValue(row, "observed_stockout_frequency"),
  }));
}

export function getPolicies() {
  return policyRows().map(({ policy, policyLabel, simulationStart, simulationEnd,
    stockoutQuantity, serviceLevelProxy, totalInventoryRelatedCost, orderCount,
    replenishmentQuantity, estimatedSpoilage, excessInventory }) => ({
    policy, policyLabel, simulationStart, simulationEnd, stockoutQuantity,
    serviceLevelProxy, totalInventoryRelatedCost, orderCount,
    replenishmentQuantity, estimatedSpoilage, excessInventory,
  }));
}

function getModelMetrics() {
  const row = csv("demand_model_results.csv").find((candidate) =>
    stringValue(candidate, "split") === "test" &&
    stringValue(candidate, "model") === "xgb_stockout_aware" &&
    stringValue(candidate, "segment") === "overall_observed_target",
  ) ?? csv("demand_model_results.csv")[0];

  return {
    model: stringValue(row, "model"),
    targetStatus: stringValue(row, "target_status"),
    n: Math.round(numberValue(row, "n")),
    mae: numberValue(row, "mae"),
    rmse: numberValue(row, "rmse"),
    wape: numberValue(row, "wape"),
    smape: numberValue(row, "smape"),
  };
}

function trend() {
  const grouped = new Map<string, { observed: number[]; forecast: number[]; stockouts: number[] }>();
  for (const row of csv("demand_forecasts_eval.csv")) {
    const date = stringValue(row, "forecast_date");
    const entry = grouped.get(date) ?? { observed: [], forecast: [], stockouts: [] };
    entry.observed.push(numberValue(row, "evaluation_observed_sale_amount"));
    entry.forecast.push(numberValue(row, "forecast_demand"));
    entry.stockouts.push(booleanValue(row, "evaluation_observed_stockout_flag") ? 1 : 0);
    grouped.set(date, entry);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({
    date,
    observedDemand: round(values.observed.reduce((sum, value) => sum + value, 0)),
    forecastDemand: round(values.forecast.reduce((sum, value) => sum + value, 0)),
    observedStockoutRate: round(average(values.stockouts), 4),
  }));
}

function riskReasons() {
  const counts = new Map<string, number>();
  for (const row of csv("supply_chain_risk_exceptions.csv")) {
    const reason = stringValue(row, "primary_reason") || "Other";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([, first], [, second]) => second - first)
    .slice(0, 6)
    .map(([reason, count]) => ({ reason, count }));
}

export function getOverview() {
  const forecasts = csv("demand_forecasts_eval.csv");
  const risks = csv("supply_chain_risk_exceptions.csv");
  const policies = policyRows();
  const selectedPolicy = policies.find((row) => row.policy === "ml_optimized") ?? policies[0];
  const levels = ["Critical", "High", "Medium", "Low"] as const;
  const riskCounts = Object.fromEntries(
    levels.map((level) => [level, risks.filter((row) => stringValue(row, "overall_risk_level") === level).length]),
  ) as Record<(typeof levels)[number], number>;
  const dates = forecasts.map((row) => stringValue(row, "forecast_date")).sort();

  return {
    assessmentDate: stringValue(risks[0], "risk_assessment_date"),
    holdoutStart: dates[0] ?? "",
    holdoutEnd: dates.at(-1) ?? "",
    forecastModel: stringValue(forecasts[0], "selected_model"),
    policyLabel: selectedPolicy?.policyLabel ?? "",
    totalSeries: selectedPolicy?.records ?? 0,
    totalStores: new Set(risks.map((row) => stringValue(row, "store_id"))).size,
    totalProducts: new Set(risks.map((row) => stringValue(row, "product_id"))).size,
    forecastMetrics: getModelMetrics(),
    riskCounts,
    exceptionCount: risks.length,
    stockoutQuantity: selectedPolicy?.stockoutQuantity ?? 0,
    serviceLevelProxy: selectedPolicy?.serviceLevelProxy ?? 0,
    observedStockoutFrequency: selectedPolicy?.observedStockoutFrequency ?? 0,
    excessInventoryQuantity: selectedPolicy?.excessInventory ?? 0,
    potentialSpoilageQuantity: numberValue(csv("forecast_inventory_policy_comparison.csv").find((row) => stringValue(row, "policy") === "ml_optimized") ?? {}, "potential_spoilage"),
    estimatedSpoilageQuantity: selectedPolicy?.estimatedSpoilage ?? 0,
    urgentReplenishmentCount: risks.filter((row) => numberValue(row, "replenishment_urgency") >= 75).length,
    replenishmentQuantity: selectedPolicy?.replenishmentQuantity ?? 0,
    costMetrics: {
      totalInventoryRelatedCost: selectedPolicy?.totalInventoryRelatedCost ?? 0,
      orderingCost: selectedPolicy?.orderingCost ?? 0,
      holdingCost: selectedPolicy?.holdingCost ?? 0,
      stockoutLostSalesCost: selectedPolicy?.stockoutLostSalesCost ?? 0,
      spoilageCost: selectedPolicy?.spoilageCost ?? 0,
    },
    trend: trend(),
    riskReasons: riskReasons(),
  };
}

export function getDrivers() {
  const examples = csv("forecast_driver_examples.csv").map((row) => ({
    exampleType: stringValue(row, "example_type"),
    storeId: numberValue(row, "store_id"),
    productId: numberValue(row, "product_id"),
    date: stringValue(row, "forecast_date"),
    forecastDemand: numberValue(row, "forecast_demand"),
    forecastLower: numberValue(row, "forecast_lower"),
    forecastUpper: numberValue(row, "forecast_upper"),
    keyDrivers: stringValue(row, "key_drivers"),
  }));
  return {
    selectedModel: stringValue(csv("demand_forecasts_eval.csv")[0], "selected_model"),
    modelDrivers: ["lag_1", "rolling_mean_7", "rolling_mean_14", "lag_7", "management_group_id"],
    examples,
    riskDrivers: riskReasons(),
  };
}

const sensitivityLabels: Record<string, string> = {
  demand_multiplier: "Demand / forecast-risk multiplier",
  forecast_risk_multiplier: "Forecast risk multiplier",
  lead_time_days: "Lead time",
  holding_cost_per_unit_day: "Holding cost per unit-day",
  stockout_cost_per_unit: "Stockout cost per unit",
  shelf_life_days: "Shelf life",
};

function scenarioRow(row: CsvRow) {
  return {
    multiplier: numberValue(row, "sensitivity_value") || numberValue(row, "forecast_risk_multiplier"),
    realizedServiceLevel: numberValue(row, "realized_holdout_service_level"),
    stockoutQuantity: numberValue(row, "stockout_quantity"),
    totalModeledCost: numberValue(row, "total_inventory_related_cost"),
    forecastPathServiceLevel: numberValue(row, "forecast_path_service_level"),
    excessInventory: numberValue(row, "excess_inventory"),
    estimatedSpoilage: numberValue(row, "estimated_spoilage"),
  };
}

export function getScenario(dimension: string, value: number) {
  const sensitivityType = dimension === "demand_multiplier" ? "forecast_risk_multiplier" : dimension;
  const rows = csv("forecast_inventory_calibration_sensitivity.csv").filter((row) =>
    stringValue(row, "sensitivity_type") === sensitivityType,
  );
  const valueKey = sensitivityType === "forecast_risk_multiplier" ? "forecast_risk_multiplier" : "sensitivity_value";
  const baseline = rows.find((row) => numberValue(row, valueKey) === 1) ??
    csv("forecast_inventory_calibration_sensitivity.csv").find((row) =>
      stringValue(row, "sensitivity_type") === "forecast_risk_multiplier" &&
      numberValue(row, "forecast_risk_multiplier") === 1,
    );
  const selected = rows.find((row) => Math.abs(numberValue(row, valueKey) - value) < 0.00001);
  if (!selected || !baseline) return null;
  return {
    dimension,
    value,
    availableValues: uniqueNumbers(rows, valueKey),
    label: sensitivityLabels[dimension] ?? dimension,
    note: "Precomputed one-factor sensitivity from the validated simulation outputs. Other assumptions remain at the stored baseline.",
    scenario: scenarioRow(selected),
    baseline: scenarioRow(baseline),
  };
}

function safeRecord(row: CsvRow): AnyRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    const numeric = Number(value);
    if (value !== "" && Number.isFinite(numeric)) return [key, numeric];
    if (value === "True" || value === "False") return [key, value === "True"];
    return [key, value];
  }));
}

function isUnsafeQuestion(question: string) {
  return /(ignore|bypass|reveal|system prompt|developer message|secret|credential|token|password|api key)/i.test(question);
}

export function answerAnalystQuestion(question: string) {
  const normalized = question.trim().toLowerCase();
  if (isUnsafeQuestion(question)) {
    return {
      question,
      intent: "safety_refusal",
      answer: "I can only answer supply-chain questions grounded in the validated project outputs. I cannot reveal system instructions, secrets, or hidden prompts.",
      grounded: false,
      sourceFiles: [],
      sourcePeriod: null,
      records: [],
    };
  }

  const overview = getOverview();
  const risks = getRisks(undefined, undefined, undefined, 1000);
  const policies = getPolicies();
  if (normalized.includes("risk") || normalized.includes("exception") || normalized.includes("stockout")) {
    const top = risks.records.slice(0, 5);
    return {
      question,
      intent: "risk_summary",
      answer: `${overview.exceptionCount} modeled SKU-store risk exceptions are recorded for ${overview.assessmentDate}. The largest risk bucket is ${overview.riskReasons[0]?.reason ?? "not available"} (${overview.riskReasons[0]?.count ?? 0} records); the stored service-level proxy is ${(overview.serviceLevelProxy * 100).toFixed(1)}%.`,
      grounded: true,
      sourceFiles: ["supply_chain_risk_exceptions.csv", "forecast_inventory_policy_comparison.csv"],
      sourcePeriod: `${overview.holdoutStart} to ${overview.holdoutEnd}`,
      records: top,
    };
  }
  if (normalized.includes("policy") || normalized.includes("cost") || normalized.includes("replenish")) {
    const best = policies.find((policy) => policy.policy === "ml_optimized") ?? policies[0];
    return {
      question,
      intent: "policy_comparison",
      answer: `The stored ${best?.policyLabel ?? "selected"} policy has a total modeled inventory-related cost of ${best?.totalInventoryRelatedCost.toFixed(0) ?? "not available"} and a service-level proxy of ${best ? (best.serviceLevelProxy * 100).toFixed(1) : "not available"}%. These are modeled simulation outputs, not observed financial results.`,
      grounded: true,
      sourceFiles: ["forecast_inventory_policy_comparison.csv"],
      sourcePeriod: `${best?.simulationStart ?? overview.holdoutStart} to ${best?.simulationEnd ?? overview.holdoutEnd}`,
      records: policies,
    };
  }
  if (normalized.includes("forecast") || normalized.includes("demand") || normalized.includes("accuracy")) {
    return {
      question,
      intent: "forecast_performance",
      answer: `The selected ${overview.forecastMetrics.model} model has test-set MAE ${overview.forecastMetrics.mae.toFixed(3)}, RMSE ${overview.forecastMetrics.rmse.toFixed(3)}, and WAPE ${(overview.forecastMetrics.wape * 100).toFixed(1)}% on the observed sales target. Observed sales can be censored by stockouts, so this should not be read as unconstrained demand truth.`,
      grounded: true,
      sourceFiles: ["demand_model_results.csv", "demand_forecasts_eval.csv"],
      sourcePeriod: `${overview.holdoutStart} to ${overview.holdoutEnd}`,
      records: [overview.forecastMetrics],
    };
  }
  return {
    question,
    intent: "scope",
    answer: "Ask about forecast performance, modeled inventory cost, replenishment policy comparison, stockout risk, or recorded exceptions. Answers are grounded in the preserved FreshRetailNet-50K evaluation and simulation outputs.",
    grounded: true,
    sourceFiles: ["demand_model_results.csv", "forecast_inventory_policy_comparison.csv", "supply_chain_risk_exceptions.csv"],
    sourcePeriod: `${overview.holdoutStart} to ${overview.holdoutEnd}`,
    records: [],
  };
}