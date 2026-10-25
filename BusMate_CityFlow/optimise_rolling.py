from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix
from scipy.stats import wilcoxon

ROOT = Path(__file__).resolve().parent
DEFAULT_FORECASTS = ROOT / "results_rolling" / "forecast_test.csv"
DEFAULT_MAPPING = ROOT / "data" / "mapping_janmar_v2.json"
DEFAULT_OUT = ROOT / "results_optimiser"

K = 60
L = 0.9
T_MIN = 90
W_WAIT = 1.0
W_OVER = 15.0
W_OP = 100.0
X_MAX = 15
X_CHOICES = np.arange(1, X_MAX + 1, dtype=np.int64)
SERVICE_HOURS = set(range(5, 22))
PEAK_HOURS = {7, 8, 9, 17, 18, 19}
PLANS = {
    "fixed": "p_fixed",
    "naive": "p_naive",
    "point": "p_point",
    "robust": "p_hi",
    "oracle": "y",
}
CSV_COLUMNS = ["fold", "timestamp", "route", "plan", "x", "cost", "wait_pmin", "overload_pax", "bus_hours"]


def cost_for_demand(d: float | np.ndarray, x: int | np.ndarray) -> np.ndarray:
    d = np.asarray(d, dtype=float)
    x = np.asarray(x, dtype=float)
    return W_WAIT * d * 30.0 / x + W_OVER * np.maximum(0.0, d - L * x * K) + W_OP * x


def integer_plan_demand(values: np.ndarray) -> np.ndarray:
    return np.ceil(np.maximum(np.asarray(values, dtype=float), 0.0)).astype(np.int64)


def optimize_fold(demand: np.ndarray, timestamps: pd.DatetimeIndex, routes: list[str], fleet_cap: int, fold: str) -> tuple[np.ndarray, list[str]]:
    n_hours, n_routes = demand.shape
    if n_routes != len(routes):
        raise ValueError(f"{fold}: route dimension mismatch")
    infeasible: list[str] = []
    if fleet_cap < n_routes:
        # Every route has the stated minimum x=1, so the hour cannot meet this fleet cap.
        # Apply the requested minimum-x relaxation and record every affected hour.
        x = np.ones((n_hours, n_routes), dtype=np.int64)
        infeasible = [str(ts) for ts in timestamps]
        return x, infeasible

    n_choices = len(X_CHOICES)
    n_route_hour = n_hours * n_routes
    n_variables = n_route_hour * n_choices
    objective = np.empty(n_variables, dtype=float)
    eq_rows: list[int] = []
    eq_cols: list[int] = []
    eq_data: list[float] = []
    cap_rows: list[int] = []
    cap_cols: list[int] = []
    cap_data: list[float] = []
    for ti in range(n_hours):
        for ri in range(n_routes):
            group = ti * n_routes + ri
            offset = group * n_choices
            objective[offset:offset+n_choices] = cost_for_demand(demand[ti, ri], X_CHOICES)
            for ci, xval in enumerate(X_CHOICES):
                col = offset + ci
                eq_rows.append(group); eq_cols.append(col); eq_data.append(1.0)
                cap_rows.append(ti); cap_cols.append(col); cap_data.append(float(xval))
    rows = eq_rows + [n_route_hour + r for r in cap_rows]
    cols = eq_cols + cap_cols
    vals = eq_data + cap_data
    matrix = coo_matrix((vals, (rows, cols)), shape=(n_route_hour + n_hours, n_variables)).tocsr()
    lower = np.concatenate([np.ones(n_route_hour), np.full(n_hours, -np.inf)])
    upper = np.concatenate([np.ones(n_route_hour), np.full(n_hours, float(fleet_cap))])
    result = milp(
        c=objective,
        integrality=np.ones(n_variables, dtype=np.int8),
        bounds=Bounds(np.zeros(n_variables), np.ones(n_variables)),
        constraints=LinearConstraint(matrix, lower, upper),
        options={"disp": False},
    )
    if result.status == 2:
        # The model is feasible whenever F >= number of routes (choose x=1), so this
        # indicates an unexpected solver/model failure rather than an hour-level infeasibility.
        raise RuntimeError(f"{fold}: SciPy MILP reported infeasible despite x=1 being feasible; {result.message}")
    if not result.success or result.x is None:
        raise RuntimeError(f"{fold}: MILP failed: status={result.status}; {result.message}")
    z = np.rint(result.x).astype(np.int8).reshape(n_hours, n_routes, n_choices)
    if not np.all(z.sum(axis=2) == 1):
        raise RuntimeError(f"{fold}: MILP solution does not select exactly one x per route-hour")
    x = (z * X_CHOICES.reshape(1, 1, -1)).sum(axis=2).astype(np.int64)
    return x, infeasible


def score_assignment(fold: str, timestamps: pd.DatetimeIndex, routes: list[str], x: np.ndarray, actual: np.ndarray, plan: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for ti, ts in enumerate(timestamps):
        for ri, route in enumerate(routes):
            y = float(actual[ti, ri])
            xi = int(x[ti, ri])
            wait = W_WAIT * y * 30.0 / xi
            overload = max(0.0, y - L * xi * K)
            op = W_OP * xi
            rows.append({
                "fold": fold,
                "timestamp": ts,
                "route": route,
                "plan": plan,
                "x": xi,
                "cost": wait + W_OVER * overload + op,
                "wait_pmin": wait,
                "overload_pax": overload,
                "bus_hours": xi * T_MIN / 60.0,
                "actual_y": y,
            })
    return rows


def summarize(group: pd.DataFrame, oracle_total: float, fixed_total: float) -> dict[str, Any]:
    actual_total = float(group.actual_y.sum())
    cost = float(group.cost.sum())
    gap = fixed_total - oracle_total
    return {
        "total_cost": cost,
        "regret_vs_oracle": cost - oracle_total,
        "share_fixed_to_oracle_regret_gap_closed": ((fixed_total - cost) / gap) if gap > 0 else None,
        "overload_passengers": float(group.overload_pax.sum()),
        "crowded_route_hours": int((group.overload_pax > 0).sum()),
        "average_wait_minutes_per_passenger": float(group.wait_pmin.sum() / actual_total) if actual_total > 0 else None,
        "bus_hours": float(group.bus_hours.sum()),
        "route_hours": int(len(group)),
    }


def compare_error_rank(forecasts: pd.DataFrame, routes: list[str]) -> dict[str, Any]:
    d = forecasts[forecasts.route.isin(routes) & forecasts.timestamp.dt.hour.isin(SERVICE_HOURS)].copy()
    demand_values: dict[str, np.ndarray] = {}
    for plan, col in PLANS.items():
        demand_values[plan] = integer_plan_demand(d[col].to_numpy())
    actual = d.y.to_numpy(dtype=float)
    mae = {p: float(np.mean(np.abs(values - actual))) for p, values in demand_values.items()}
    errors_ranked = sorted(mae, key=lambda p: (mae[p], p))
    return {p: {"forecast_mae_passengers": mae[p], "forecast_error_rank": i + 1} for i, p in enumerate(errors_ranked)}


def wilcoxon_tests(scored: pd.DataFrame) -> dict[str, Any]:
    scored = scored.copy()
    scored["date"] = scored.timestamp.dt.normalize()
    daily_route = scored.groupby(["date", "route", "plan"], as_index=False).cost.sum()
    wide = daily_route.pivot(index=["date", "route"], columns="plan", values="cost")
    for p in PLANS:
        if p not in wide:
            raise ValueError(f"Missing plan in daily paired data: {p}")
    # Oracle regret cancels in paired differences, so paired plan-cost differences
    # are exactly paired daily route-level regret differences.
    comparisons = [("point_vs_fixed", "point", "fixed"), ("robust_vs_fixed", "robust", "fixed"), ("point_vs_naive", "point", "naive")]
    output: dict[str, Any] = {}
    for name, first, second in comparisons:
        diff = (wide[first] - wide[second]).dropna().to_numpy(dtype=float)
        if len(diff) == 0:
            output[name] = {"n_daily_route_pairs": 0, "median_paired_difference": None, "p_value": None}
        elif np.allclose(diff, 0):
            output[name] = {"n_daily_route_pairs": int(len(diff)), "median_paired_difference": 0.0, "p_value": 1.0}
        else:
            test = wilcoxon(diff, zero_method="wilcox", alternative="two-sided", method="auto")
            output[name] = {"n_daily_route_pairs": int(len(diff)), "median_paired_difference": float(np.median(diff)), "p_value": float(test.pvalue)}
    return output


def main() -> int:
    ap = argparse.ArgumentParser(description="MILP decision optimisation for rolling forecasts")
    ap.add_argument("--forecasts", type=Path, default=DEFAULT_FORECASTS)
    ap.add_argument("--mapping", type=Path, default=DEFAULT_MAPPING)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()
    if args.out.exists() and any(args.out.iterdir()):
        raise SystemExit(f"Refusing to overwrite non-empty output directory: {args.out}")
    if not args.forecasts.is_file() or not args.mapping.is_file():
        raise SystemExit("Required forecast or mapping input is missing")
    mapping = json.loads(args.mapping.read_text(encoding="utf-8"))
    routes = [item["source_route"] for item in mapping["mapped_routes"]]
    if len(routes) != 8 or len(set(routes)) != 8:
        raise SystemExit("Mapping must contain exactly eight unique source routes")
    if "SER_9b2d" in routes:
        raise SystemExit("Excluded SER_9b2d route found in optimizer mapping")

    forecasts = pd.read_csv(args.forecasts, parse_dates=["timestamp"])
    required = {"fold", "timestamp", "route", "y", "p_point", "p_lo", "p_hi", "p_naive", "p_fixed"}
    missing = required - set(forecasts.columns)
    if missing:
        raise SystemExit(f"Forecast file missing columns: {sorted(missing)}")
    forecasts = forecasts[forecasts.route.isin(routes) & forecasts.timestamp.dt.hour.isin(SERVICE_HOURS)].copy()
    if forecasts.duplicated(["fold", "timestamp", "route"]).any():
        raise SystemExit("Duplicate fold/timestamp/route forecast rows")
    if (forecasts["y"] < 0).any():
        raise SystemExit("Actual demand contains negative values")
    folds = sorted(forecasts.fold.unique(), key=lambda x: int(str(x).replace("fold", "")))
    all_rows: list[dict[str, Any]] = []
    fleet_by_fold: dict[str, dict[str, Any]] = {}
    infeasible_log: list[dict[str, str]] = []
    print("solver=scipy.optimize.milp (SciPy HiGHS backend)")
    print(f"mapped_routes={routes}; folds={len(folds)}; service_hours=05-21")
    print(f"parameters=K:{K}, L:{L}, T_min:{T_MIN}, w_wait:{W_WAIT}, w_over:{W_OVER}, w_op:{W_OP}, x_max:{X_MAX}")
    for fold in folds:
        fd = forecasts[forecasts.fold == fold].copy()
        times = pd.DatetimeIndex(sorted(fd.timestamp.unique()))
        if len(times) == 0:
            raise SystemExit(f"No service-hour rows in {fold}")
        pivot = fd.pivot(index="timestamp", columns="route", values="y").reindex(index=times, columns=routes)
        if pivot.isna().any().any():
            raise SystemExit(f"{fold}: missing one or more mapped route-hour rows")
        actual = pivot.to_numpy(dtype=float)
        plan_demand: dict[str, np.ndarray] = {}
        for plan, col in PLANS.items():
            pv = fd.pivot(index="timestamp", columns="route", values=col).reindex(index=times, columns=routes)
            if pv.isna().any().any():
                raise SystemExit(f"{fold}: missing {plan} forecast values")
            plan_demand[plan] = integer_plan_demand(pv.to_numpy(dtype=float))

        # Define F solely from the unconstrained fixed plan at its busiest hour.
        fixed_d = plan_demand["fixed"]
        fixed_unconstrained = np.argmin(cost_for_demand(fixed_d[:, :, None], X_CHOICES[None, None, :]), axis=2) + 1
        buses_by_hour = fixed_unconstrained.sum(axis=1)
        peak_idx = int(np.argmax(buses_by_hour))
        fleet_cap = int(buses_by_hour[peak_idx])
        fleet_by_fold[str(fold)] = {"F": fleet_cap, "busiest_timestamp": str(times[peak_idx]), "fixed_unconstrained_buses_at_busiest_hour": fleet_cap}
        print(f"{fold}: F={fleet_cap}; fixed_plan_busiest_hour={times[peak_idx]}; service_timestamps={len(times)}", flush=True)

        for plan in PLANS:
            assignment, relaxed = optimize_fold(plan_demand[plan], times, routes, fleet_cap, str(fold))
            for ts in relaxed:
                infeasible_log.append({"fold": str(fold), "timestamp": ts, "relaxation": "set every route x=1"})
            rows = score_assignment(str(fold), times, routes, assignment, actual, plan)
            all_rows.extend(rows)
            buses = pd.DataFrame(rows).groupby("timestamp").x.sum()
            if fleet_cap >= len(routes) and (buses > fleet_cap).any():
                raise RuntimeError(f"{fold}/{plan}: fleet cap violated after solve")

    scored = pd.DataFrame(all_rows)
    if scored.empty:
        raise SystemExit("No optimized plan rows")
    out_csv = args.out / "plans.csv"
    out_json = args.out / "decision_metrics.json"
    if out_csv.exists() or out_json.exists():
        raise SystemExit("Refusing to overwrite existing optimiser output file")

    # Aggregate metrics by fold and across all folds.
    fold_metrics: dict[str, Any] = {}
    peak_regret: dict[str, Any] = {}
    for fold in folds:
        block = scored[scored.fold == fold]
        totals = block.groupby("plan").cost.sum().to_dict()
        oracle_total = float(totals["oracle"])
        fixed_total = float(totals["fixed"])
        fold_metrics[str(fold)] = {p: summarize(block[block.plan == p], oracle_total, fixed_total) for p in PLANS}
        peak = block[block.timestamp.dt.hour.isin(PEAK_HOURS)]
        peak_totals = peak.groupby("plan").cost.sum().to_dict()
        peak_oracle = float(peak_totals["oracle"])
        peak_fixed = float(peak_totals["fixed"])
        peak_regret[str(fold)] = {p: {
            "total_cost": float(peak_totals[p]),
            "regret_vs_oracle": float(peak_totals[p] - peak_oracle),
            "share_fixed_to_oracle_regret_gap_closed": ((peak_fixed - float(peak_totals[p])) / (peak_fixed - peak_oracle)) if peak_fixed > peak_oracle else None,
        } for p in PLANS}

    pooled_metrics: dict[str, Any] = {}
    pooled_totals = scored.groupby("plan").cost.sum().to_dict()
    pooled_oracle = float(pooled_totals["oracle"])
    pooled_fixed = float(pooled_totals["fixed"])
    pooled_metrics = {p: summarize(scored[scored.plan == p], pooled_oracle, pooled_fixed) for p in PLANS}
    peak_all = scored[scored.timestamp.dt.hour.isin(PEAK_HOURS)]
    pooled_peak_totals = peak_all.groupby("plan").cost.sum().to_dict()
    pooled_peak_oracle = float(pooled_peak_totals["oracle"])
    pooled_peak_fixed = float(pooled_peak_totals["fixed"])
    peak_regret["pooled"] = {p: {
        "total_cost": float(pooled_peak_totals[p]),
        "regret_vs_oracle": float(pooled_peak_totals[p] - pooled_peak_oracle),
        "share_fixed_to_oracle_regret_gap_closed": ((pooled_peak_fixed - float(pooled_peak_totals[p])) / (pooled_peak_fixed - pooled_peak_oracle)) if pooled_peak_fixed > pooled_peak_oracle else None,
    } for p in PLANS}

    # Sanity checks requested by the user. These are reported, not used to stop.
    bus_hourly = scored.groupby(["fold", "timestamp", "plan"], as_index=False).x.sum()
    fleet_table = pd.DataFrame([{"fold": f, "F": v["F"]} for f, v in fleet_by_fold.items()])
    bus_hourly = bus_hourly.merge(fleet_table, on="fold", how="left")
    sanity_a = bool((bus_hourly.x <= bus_hourly.F).all())
    oracle_order: dict[str, bool] = {}
    for fold in folds:
        costs = scored[scored.fold == fold].groupby("plan").cost.sum()
        oracle_order[str(fold)] = bool(float(costs["oracle"]) <= min(float(costs[p]) + 1e-8 for p in PLANS if p != "oracle"))
    sanity_b = all(oracle_order.values())
    crowded_counts = {p: int(((scored.plan == p) & (scored.overload_pax > 0)).sum()) for p in PLANS}
    sanity_c = all(v > 0 for v in crowded_counts.values())
    sanity_d = len(infeasible_log) == 0

    # Forecast error ranking uses the same clipped, ceiling-rounded plan demand used in decisions.
    forecast_error_rank = compare_error_rank(forecasts, routes)
    forecast_rank = sorted(forecast_error_rank, key=lambda p: (forecast_error_rank[p]["forecast_mae_passengers"], p))
    regret_values = {p: float(pooled_metrics[p]["regret_vs_oracle"]) for p in PLANS}
    regret_rank = sorted(regret_values, key=lambda p: (regret_values[p], p))
    ranking = {p: {**forecast_error_rank[p], "regret_total": regret_values[p], "regret_rank": regret_rank.index(p)+1} for p in PLANS}
    wilcoxon_results = wilcoxon_tests(scored)

    metrics = {
        "solver": {"name": "scipy.optimize.milp", "scipy_version": __import__("scipy").__version__, "backend": "HiGHS"},
        "parameters": {"K": K, "L": L, "T_min": T_MIN, "w_wait": W_WAIT, "w_over": W_OVER, "w_op": W_OP, "x_min": 1, "x_max": X_MAX, "service_hours_inclusive": [5, 21], "peak_hours": sorted(PEAK_HOURS), "demand_rounding": "clip below 0 to 0; ceil to integer"},
        "fleet_cap_by_fold": fleet_by_fold,
        "plans": {p: {"demand_column": PLANS[p]} for p in PLANS},
        "per_fold": fold_metrics,
        "pooled": pooled_metrics,
        "peak_hours_regret_table": peak_regret,
        "crowded_route_hours_per_plan": crowded_counts,
        "wilcoxon_daily_route_level_regret": wilcoxon_results,
        "forecast_error_vs_regret_ranking": {"ranking": ranking, "forecast_error_order_best_to_worst": forecast_rank, "regret_order_best_to_worst": regret_rank},
        "sanity_checks": {"buses_on_road_le_fleet_cap_every_hour_every_plan": sanity_a, "oracle_cost_le_all_other_plans_each_fold": sanity_b, "crowded_route_hours_nonzero_for_every_plan": sanity_c, "infeasible_hours_relaxed_to_min_x": sanity_d, "infeasible_hours": infeasible_log, "oracle_order_by_fold": oracle_order},
        "row_counts": {"optimized_route_hours_per_plan": int(len(scored) // len(PLANS)), "plans_csv_rows": int(len(scored)), "test_folds": len(folds)},
        "forecast_error_demand_transform": "Each plan prediction clipped at zero and rounded upward before forecast MAE; oracle uses actual y.",
    }
    args.out.mkdir(parents=True, exist_ok=True)
    scored[CSV_COLUMNS].to_csv(out_csv, index=False)
    out_json.write_text(json.dumps(metrics, indent=2, allow_nan=False) + "\n", encoding="utf-8")

    print("SANITY CHECKS (reported, not stopping):")
    print(f"a_buses_on_road_le_F={sanity_a}")
    print(f"b_oracle_cost_le_other_plans_each_fold={sanity_b}; by_fold={oracle_order}")
    print(f"c_crowded_route_hours_nonzero_every_plan={sanity_c}; counts={crowded_counts}")
    print(f"d_infeasible_hours_relaxed_to_x_min={sanity_d}; hours={infeasible_log}")
    print(f"wrote {out_csv} and {out_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
