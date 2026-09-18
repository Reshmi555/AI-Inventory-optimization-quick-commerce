# Supply Chain Analytics

Recruiter-facing analytics application for AI-driven inventory optimization using validated observations and modeled supply-chain outputs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth read-only API contract.
- `artifacts/api-server/src/lib/supplyChainData.ts` — read-only loaders and grounded analyst logic over preserved CSV/JSON outputs.
- `artifacts/api-server/data/supply-chain/` — copied validated structured outputs; no raw retailer data or database migration is required.
- `artifacts/supply-chain-analytics/src/pages/dashboard.tsx` — responsive six-area analytics UI.
- `artifacts/supply-chain-analytics/src/components/analytics/primitives.tsx` — chart, KPI, loading, empty, error, and CSV export primitives.

## Architecture decisions

- The analytics API is file-backed and read-only so existing validated outputs remain the source of truth.
- Observed FreshRetailNet-50K values are labeled separately from modeled/simulated inventory, cost, risk, and scenario values.
- Scenario Analysis exposes stored one-factor sensitivity values only; it does not run a new simulation or alter model assumptions.
- The analyst is deliberately grounded to the preserved outputs and includes prompt-injection/unavailable-data safeguards.

## Product

The app provides Executive Overview, Demand Forecasting, Inventory & Replenishment, Supply Chain Risk, AI Supply Chain Analyst, and Scenario Analysis views. It includes responsive navigation, store/product filters, chart CSV exports, refresh/PDF/dark-mode controls, loading/error/empty states, and source-period/provenance context.

## User preferences

- Do not retrain the forecasting model or modify the underlying forecasting, inventory simulation, replenishment, risk, or analyst logic.
- Do not fabricate sales, forecasts, costs, savings, supplier performance, or company-specific retailer results.

## Gotchas

- Managed workflows supply `PORT` and `BASE_PATH`; standalone Vite builds need those environment variables explicitly.
- Auto-refresh is off by default and uses a minimum five-minute interval.
- Scenario values must come from the stored sensitivity output; unavailable values should return a visible unavailable state.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
