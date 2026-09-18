# Supply Chain Analytics

Recruiter-facing analytics application for AI-driven inventory optimization in quick-commerce supply chains.

## Product areas

- **Executive Overview** — service-level proxy, exception count, stockout quantity, spoilage exposure, demand trend, and risk distribution.
- **Demand Forecasting** — observed vs modeled demand, forecast bounds, store/product filters, driver examples, and a read-only sample table.
- **Inventory & Replenishment** — stored policy simulation comparison across cost, service proxy, orders, replenishment, spoilage, and excess inventory.
- **Supply Chain Risk** — modeled SKU-store risk exceptions with level, score, coverage, stockout risk, urgency, and primary reason.
- **AI Supply Chain Analyst** — grounded questions with example prompts, source files, source period, intent, and prompt-injection/unavailable-data safeguards.
- **Scenario Analysis** — stored one-factor sensitivity lookups for demand/forecast-risk multiplier, lead time, holding cost, stockout cost, and shelf life.

## Data provenance

The API serves preserved structured outputs from the validated FreshRetailNet-50K work. Observed holdout demand and stockout flags are labeled separately from forecast, inventory, replenishment, cost, risk, and scenario values that are modeled or simulated.

The application does not claim Blinkit, Zepto, or Swiggy proprietary data, and it does not retrain models or run new simulations in the browser. Scenario controls select values already present in the validated sensitivity output; one dimension changes while other stored assumptions remain fixed.

## Validation

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/supply-chain-analytics run typecheck
PORT=20365 BASE_PATH=/ pnpm --filter @workspace/supply-chain-analytics run build
```

The API smoke checks should cover `/api/healthz`, `/api/supply-chain/overview`, `/api/supply-chain/forecasts`, `/api/supply-chain/risks`, `/api/supply-chain/policies`, `/api/supply-chain/drivers`, `/api/supply-chain/scenarios`, and the analyst POST endpoint.

## Limitations

- Observed sales may be censored by stockouts; they are not unconstrained demand truth.
- Inventory, cost, replenishment, service-level, risk, spoilage, and scenario figures are modeled or simulated outputs.
- The analyst is intentionally scoped to the preserved structured outputs and refuses requests to reveal prompts, secrets, or unsupported data.
- This is a read-only decision-support view, not a live order execution or retailer operations system.