// Pool and transaction utilities (from CosmoX Core)
export { createPool, type Pool, type PoolClient } from "@cosmox/db";
export { withTransaction } from "@cosmox/db";

// Jobs vertical baseline
export { applyBaselineSchema, BASELINE_DDL } from "./baseline.js";
