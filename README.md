# AI-Driven Inventory Optimization for Quick-Commerce Supply Chains

An AI-driven supply chain analytics project that combines demand forecasting, inventory simulation, cost-aware replenishment, supply-chain risk detection, and a grounded AI analyst.

## Project Overview

This project explores how AI-based demand forecasts can be translated into inventory and replenishment decisions for a quick-commerce dark-store network.

The project uses the **FreshRetailNet-50K** dataset for observed store–SKU sales and operational signals, while inventory, cost, lead-time, shelf-life, and replenishment parameters are explicitly modeled as scenario assumptions.

## Key Components

- AI demand forecasting using XGBoost
- Stockout-aware feature engineering
- Cost-aware inventory replenishment simulation
- Inventory and service-level trade-off analysis
- Supply-chain risk and exception detection
- Forecast uncertainty analysis
- Grounded AI Supply Chain Analyst
- Interactive supply-chain control-room dashboard
- Scenario and sensitivity analysis

## Tech Stack

**Python | XGBoost | SQL | Power BI | Machine Learning | Supply Chain Analytics | React | TypeScript**

## Data

The forecasting component uses the **FreshRetailNet-50K** dataset, containing store–product time-series data with sales, stockout-related signals, promotions, holidays, and weather context.

The project does **not** claim to use proprietary data from Blinkit, Zepto, Swiggy, or any other company.

## Important Assumptions

Inventory quantities, lead times, holding costs, ordering costs, stockout costs, shelf-life parameters, and spoilage economics are modeled assumptions used for scenario analysis.

Simulation outputs should therefore be interpreted as analytical diagnostics rather than historical company performance or guaranteed business outcomes.

## Dashboard

The project includes an interactive dashboard covering:

1. Executive Overview
2. Demand Forecasting
3. Inventory & Replenishment
4. Supply Chain Risk
5. AI Supply Chain Analyst
6. Scenario Analysis

## Live Demo

https://ai555.netlify.app

## Project Objective

The overall objective is to demonstrate how machine learning and supply-chain analytics can support SKU-level demand planning, replenishment decisions, and inventory-risk management in a quick-commerce environment.
