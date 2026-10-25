from __future__ import annotations

import csv
import hashlib
import json
import math
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import wilcoxon


ROOT = Path(__file__).resolve().parent
SERVICE_HOURS = set(range(5, 22))
PEAK_HOURS = {7, 8, 9, 17, 18, 19}
PLAN_COLUMNS = {
    "fixed": "p_fixed",
    "naive": "p_naive",
    "point": "p_point",
    "robust": "p_hi",
    "oracle": "y",
}
PARAMS = {"K": 60.0, "L": 0.9, "T_min": 90.0, "w_wait": 1.0, "w_over": 15.0, "w_op": 100.0}
X_FLOOR = 15
OUT_COLUMNS = ["fold", "timestamp", "route", "plan", "x", "cost", "wait_pmin", "overload_pax", "bus_hours"]


def demand_int(a: np.ndarray) -> np.ndarray:
    return np.ceil(np.maximum(np.asarray(a, dtype=float), 0.0)).astype(np.int64)


def row_cost(demand: float, x: int, p: dict[str, float]) -> float:
    return (p["w_wait"] * demand * 30.0 / x
            + p["w_over"] * max(0.0, demand - p["L"] * x * p["K"])
            + p["w_op"] * x)


def solve_hour(demand: np.ndarray, x_maxes: np.ndarray, p: dict[str, float], cap_units: int | None) -> np.ndarray:
    """Exact allocation for this separable discrete-convex objective."""
    n = len(demand)
    upper = np.maximum(np.asarray(x_maxes, dtype=int), 1)
    x = np.ones(n, dtype=int)
    for r in range(n):
        costs = [row_cost(float(demand[r]), v, p) for v in range(1, int(upper[r]) + 1)]
        x[r] = int(np.argmin(costs)) + 1
    if cap_units is None:
        return x
    cap = max(int(cap_units), n)
    x[:] = 1
    while int(x.sum()) < cap:
        best_route = -1
        best_delta = 0.0
        for r in range(n):
            if x[r] >= upper[r]:
                continue
            delta = row_cost(float(demand[r]), int(x[r] + 1), p) - row_cost(float(demand[r]), int(x[r]), p)
            if delta < best_delta - 1e-12:
                best_delta, best_route = delta, r
        if best_route < 0:
            break
        x[best_route] += 1
    return x


def route_xmax(hourly_path: Path, routes: list[str], p: dict[str, float]) -> dict[str, int]:
    # Include absent route-hour cells as zero in the training-period percentile.
    raw = pd.read_csv(hourly_path, usecols=["route", "timestamp", "boardings"])
    raw["timestamp"] = pd.to_datetime(raw["timestamp"], errors="coerce")
    raw = raw[raw.route.isin(routes)]
    raw = raw[(raw.timestamp >= "2018-01-01") & (raw.timestamp < "2018-02-11") & raw.timestamp.dt.hour.isin(SERVICE_HOURS)]
    expected = pd.date_range("2018-01-01 05:00", "2018-02-10 21:00", freq="h")
    expected = expected[expected.hour.isin(SERVICE_HOURS)]
    result: dict[str, int] = {}
    for route in routes:
        series = raw.loc[raw.route == route].set_index("timestamp")["boardings"].groupby(level=0).sum()
        values = series.reindex(expected, fill_value=0).to_numpy(dtype=float)
        p99 = float(np.quantile(values, 0.99))
        cap = max(X_FLOOR, int(math.ceil(1.25 * p99 / (p["L"] * p["K"]))))
        result[route] = cap
    return result


def plan_arrays(fold_df: pd.DataFrame, times: pd.DatetimeIndex, routes: list[str]) -> dict[str, np.ndarray]:
    out: dict[str, np.ndarray] = {}
    for plan, col in PLAN_COLUMNS.items():
        piv = fold_df.pivot(index="timestamp", columns="route", values=col).reindex(index=times, columns=routes)
        if piv.isna().any().any():
            raise ValueError(f"Missing {plan} values for one or more mapped route-hours")
        out[plan] = demand_int(piv.to_numpy(dtype=float))
    return out


def optimize_run(forecasts: pd.DataFrame, routes: list[str], p: dict[str, float],
                 xmaxes: dict[str, int]) -> tuple[pd.DataFrame, dict[str, Any]]:
    all_rows: list[dict[str, Any]] = []
    fleet: dict[str, Any] = {}
    fold_frames: dict[str, pd.DataFrame] = {}
    route_caps = np.array([xmaxes[r] for r in routes], dtype=int)
    for fold in sorted(forecasts.fold.unique(), key=lambda f: int(str(f).replace("fold", ""))):
        ff = forecasts[forecasts.fold == fold].copy()
        times = pd.DatetimeIndex(sorted(ff.timestamp.unique()))
        arrays = plan_arrays(ff, times, routes)
        actual = arrays["oracle"]
        fixed_uncapped = np.vstack([solve_hour(d, route_caps, p, None) for d in arrays["fixed"]])
        fixed_units_max = int(fixed_uncapped.sum(axis=1).max())
        f_buses = fixed_units_max * p["T_min"] / 60.0
        peak_idx = int(np.argmax(fixed_uncapped.sum(axis=1)))
        fleet[str(fold)] = {
            "F_buses": float(f_buses),
            "F_departure_units": fixed_units_max,
            "fixed_busiest_timestamp": str(times[peak_idx]),
            "fixed_busiest_departures": fixed_units_max,
        }
        fold_rows: list[dict[str, Any]] = []
        for plan, demands in arrays.items():
            assignments = fixed_uncapped if plan == "fixed" else np.vstack([
                solve_hour(d, route_caps, p, fixed_units_max) for d in demands
            ])
            for ti, ts in enumerate(times):
                for ri, route in enumerate(routes):
                    x = int(assignments[ti, ri])
                    y = float(actual[ti, ri])
                    wait = p["w_wait"] * y * 30.0 / x
                    over = max(0.0, y - p["L"] * x * p["K"])
                    cost = wait + p["w_over"] * over + p["w_op"] * x
                    fold_rows.append({"fold": str(fold), "timestamp": ts, "route": route, "plan": plan,
                                      "x": x, "cost": cost, "wait_pmin": wait,
                                      "overload_pax": over, "bus_hours": x * p["T_min"] / 60.0,
                                      "actual_y": y})
        fold_frames[str(fold)] = pd.DataFrame(fold_rows)
        all_rows.extend(fold_rows)
    return pd.DataFrame(all_rows), {"fleet": fleet, "fold_frames": fold_frames}


def summarize(frame: pd.DataFrame, oracle_cost: float, fixed_cost: float, p: dict[str, float]) -> dict[str, Any]:
    ysum = float(frame.actual_y.sum())
    total = float(frame.cost.sum())
    gap = fixed_cost - oracle_cost
    return {
        "total_cost": total,
        "regret_vs_oracle": total - oracle_cost,
        "share_fixed_to_oracle_regret_gap_closed": (fixed_cost - total) / gap if gap > 1e-12 else None,
        "overload_passengers": float(frame.overload_pax.sum()),
        "crowded_route_hours": int((frame.overload_pax > 0).sum()),
        "crowded_route_hour_share": float((frame.overload_pax > 0).mean()) if len(frame) else None,
        "average_wait_minutes_per_passenger": float(frame.wait_pmin.sum() / ysum) if ysum else None,
        "bus_hours": float(frame.bus_hours.sum()),
        "route_hours": int(len(frame)),
    }


def metrics_for_run(scored: pd.DataFrame, fleet: dict[str, Any], p: dict[str, float]) -> dict[str, Any]:
    folds = sorted(scored.fold.unique(), key=lambda f: int(str(f).replace("fold", "")))
    per_fold: dict[str, Any] = {}
    peak_table: dict[str, Any] = {}
    binding: dict[str, dict[str, Any]] = {}
    sanity_a = True
    sanity_b = True
    crowded: dict[str, int] = {}
    for fold in folds:
        block = scored[scored.fold == fold]
        totals = block.groupby("plan").cost.sum().to_dict()
        oracle = float(totals["oracle"])
        fixed = float(totals["fixed"])
        per_fold[str(fold)] = {plan: summarize(block[block.plan == plan], oracle, fixed, p) for plan in PLAN_COLUMNS}
        peak = block[block.timestamp.dt.hour.isin(PEAK_HOURS)]
        ptotals = peak.groupby("plan").cost.sum().to_dict()
        poracle, pfixed = float(ptotals["oracle"]), float(ptotals["fixed"])
        peak_table[str(fold)] = {plan: {"total_cost": float(ptotals[plan]),
            "regret_vs_oracle": float(ptotals[plan] - poracle),
            "share_fixed_to_oracle_regret_gap_closed": (pfixed-float(ptotals[plan]))/(pfixed-poracle) if pfixed > poracle else None}
            for plan in PLAN_COLUMNS}
        grouped = block.groupby(["timestamp", "plan"], as_index=False).x.sum()
        grouped["buses"] = grouped.x * p["T_min"] / 60.0
        cap = float(fleet[str(fold)]["F_buses"])
        if (grouped.buses > cap + 1e-9).any():
            sanity_a = False
        binding[str(fold)] = {}
        for plan in PLAN_COLUMNS:
            vals = grouped[grouped.plan == plan].buses
            binding[str(fold)][plan] = {"binding_hours": int(np.isclose(vals, cap, atol=1e-9).sum()),
                                          "hours": int(len(vals)),
                                          "binding_share": float(np.isclose(vals, cap, atol=1e-9).mean()) if len(vals) else None}
        sanity_b &= all(float(totals["oracle"]) <= float(totals[q]) + 1e-8 for q in PLAN_COLUMNS if q != "oracle")
        for plan in PLAN_COLUMNS:
            crowded[plan] = crowded.get(plan, 0) + int(((block.plan == plan) & (block.overload_pax > 0)).sum())
    totals = scored.groupby("plan").cost.sum().to_dict()
    oracle, fixed = float(totals["oracle"]), float(totals["fixed"])
    pooled = {plan: summarize(scored[scored.plan == plan], oracle, fixed, p) for plan in PLAN_COLUMNS}
    peak = scored[scored.timestamp.dt.hour.isin(PEAK_HOURS)]
    ptotals = peak.groupby("plan").cost.sum().to_dict()
    poracle, pfixed = float(ptotals["oracle"]), float(ptotals["fixed"])
    peak_table["pooled"] = {plan: {"total_cost": float(ptotals[plan]),
        "regret_vs_oracle": float(ptotals[plan]-poracle),
        "share_fixed_to_oracle_regret_gap_closed": (pfixed-float(ptotals[plan]))/(pfixed-poracle) if pfixed > poracle else None}
        for plan in PLAN_COLUMNS}
    all_binding: dict[str, Any] = {}
    for plan in PLAN_COLUMNS:
        bh = sum(binding[f][plan]["binding_hours"] for f in binding)
        nh = sum(binding[f][plan]["hours"] for f in binding)
        all_binding[plan] = {"binding_hours": bh, "hours": nh, "binding_share": bh / nh if nh else None}
    crowded_shares = {plan: {"route_hours": crowded[plan], "total_route_hours": int((scored.plan == plan).sum()),
                              "share": crowded[plan] / int((scored.plan == plan).sum())}
                      for plan in PLAN_COLUMNS}
    # Paired daily route-level regret differences; oracle is common and cancels.
    day = scored.assign(day=scored.timestamp.dt.normalize()).groupby(["day", "route", "plan"], as_index=False).cost.sum()
    wide = day.pivot(index=["day", "route"], columns="plan", values="cost")
    wilcox: dict[str, Any] = {}
    for key, left, right in [("point_vs_fixed", "point", "fixed"), ("robust_vs_fixed", "robust", "fixed"), ("point_vs_naive", "point", "naive")]:
        diff = (wide[left] - wide[right]).dropna().to_numpy(float)
        test = wilcoxon(diff, zero_method="wilcox", alternative="two-sided", method="auto") if len(diff) and not np.allclose(diff, 0) else None
        wilcox[key] = {"n_daily_route_pairs": len(diff), "median_paired_difference": float(np.median(diff)) if len(diff) else None,
                       "p_value": float(test.pvalue) if test is not None else (1.0 if len(diff) else None)}
    return {"per_fold": per_fold, "pooled": pooled, "peak_hours_regret_table": peak_table,
            "fleet_binding": {"per_fold": binding, "pooled": all_binding}, "crowded_route_hours": crowded_shares,
            "wilcoxon_daily_route_level_regret": wilcox,
            "sanity_checks": {"buses_on_road_le_fleet_cap_every_hour_every_plan": sanity_a,
                              "oracle_total_cost_le_other_plans_each_fold": sanity_b,
                              "crowded_route_hours_nonzero": all(v["route_hours"] > 0 for v in crowded_shares.values()),
                              "infeasible_hours": []}}


def ranking(scored: pd.DataFrame, forecasts: pd.DataFrame, routes: list[str]) -> dict[str, Any]:
    d = forecasts[forecasts.route.isin(routes) & forecasts.timestamp.dt.hour.isin(SERVICE_HOURS)]
    y = d.y.to_numpy(float)
    cols = {"fixed": "p_fixed", "naive": "p_naive", "point": "p_point", "robust": "p_hi", "oracle": "y"}
    mae = {k: float(np.mean(np.abs(demand_int(d[v].to_numpy(float)) - y))) for k, v in cols.items()}
    err_order = sorted(mae, key=lambda k: (mae[k], k))
    regrets = {k: float(scored[scored.plan == k].cost.sum() - scored[scored.plan == "oracle"].cost.sum()) for k in cols}
    reg_order = sorted(regrets, key=lambda k: (regrets[k], k))
    return {"forecast_error_order_best_to_worst": err_order, "regret_order_best_to_worst": reg_order,
            "by_plan": {k: {"forecast_mae": mae[k], "forecast_error_rank": err_order.index(k)+1,
                            "pooled_regret": regrets[k], "regret_rank": reg_order.index(k)+1} for k in cols}}


def sensitivity(forecasts: pd.DataFrame, routes: list[str], p99: dict[str, float], main: dict[str, Any]) -> dict[str, Any]:
    specs: list[tuple[str, float, dict[str, float]]] = []
    for key in ["K", "L", "w_wait", "w_over", "w_op"]:
        for mult in (0.75, 1.25):
            p = dict(PARAMS)
            val = PARAMS[key] * mult
            if key == "L":
                val = min(val, 0.99)
            p[key] = val
            specs.append((key, val, p))
    runs: dict[str, Any] = {}
    for key, val, p in specs:
        xmaxes = {r: max(X_FLOOR, int(math.ceil(1.25 * p99[r] / (p["L"] * p["K"])))) for r in routes}
        scored, _ = optimize_run(forecasts, routes, p, xmaxes)
        met = metrics_for_run(scored, {}, p) if False else None
        # A compact sensitivity summary; unlike the main run, fleet is recomputed per setting.
        costs = scored.groupby("plan").cost.sum().to_dict()
        regrets = {pl: float(costs[pl] - costs["oracle"]) for pl in PLAN_COLUMNS}
        gap = costs["fixed"] - costs["oracle"]
        closed = {pl: (float(costs["fixed"] - costs[pl]) / gap if gap > 1e-12 else None) for pl in ["naive", "point", "robust"]}
        point = scored[scored.plan == "point"]
        d = scored.assign(day=scored.timestamp.dt.normalize()).groupby(["day", "route", "plan"], as_index=False).cost.sum()
        w = d.pivot(index=["day", "route"], columns="plan", values="cost")
        diff = (w.point - w.fixed).to_numpy(float)
        wt = wilcoxon(diff, zero_method="wilcox", alternative="two-sided", method="auto") if not np.allclose(diff, 0) else None
        reg_order = sorted(regrets, key=lambda pl: (regrets[pl], pl))
        main_order = main["ranking"]["regret_order_best_to_worst"]
        tag = f"{key}_{val:g}"
        runs[tag] = {"parameter": key, "value": val, "x_max_by_route": xmaxes, "fleet_cap_by_fold": _["fleet"],
                     "regret_by_plan": regrets, "gap_closed_naive_point_robust": closed,
                     "point_crowded_route_hour_share": float((point.overload_pax > 0).mean()),
                     "wilcoxon_point_vs_fixed": {"p_value": float(wt.pvalue) if wt else 1.0,
                                                 "median_paired_difference": float(np.median(diff))},
                     "regret_ranking_best_to_worst": reg_order,
                     "ranking_identical_to_main": reg_order == main_order}
    return {"protocol": "one parameter at a time; +/-25%; L upper-capped at 0.99; x_max recomputed per setting",
            "runs": runs}


def dashboard_exports(scored: pd.DataFrame, forecasts: pd.DataFrame, routes: list[str], mapping: dict[str, Any],
                      route_summary: pd.DataFrame, config: dict[str, Any], main_metrics: dict[str, Any],
                      ranking_data: dict[str, Any], rolling_metrics: dict[str, Any], xmaxes: dict[str, int], out: Path) -> None:
    mapped = {x["source_route"]: x["pune_id"] for x in mapping["mapped_routes"]}
    to_id = lambda s: mapped[s]
    d = forecasts[forecasts.route.isin(routes) & forecasts.timestamp.dt.hour.isin(SERVICE_HOURS)].copy()
    actual = d.y.to_numpy(float)
    metrics = {
        "fixed": {"MAE": float(np.mean(np.abs(d.p_fixed.to_numpy(float)-actual))), "RMSE": float(np.sqrt(np.mean((d.p_fixed.to_numpy(float)-actual)**2)))},
        "naive": {"MAE": float(np.mean(np.abs(d.p_naive.to_numpy(float)-actual))), "RMSE": float(np.sqrt(np.mean((d.p_naive.to_numpy(float)-actual)**2)))},
        "lgbm_point": {"MAE": float(np.mean(np.abs(d.p_point.to_numpy(float)-actual))), "RMSE": float(np.sqrt(np.mean((d.p_point.to_numpy(float)-actual)**2)))},
        "interval": {"target_coverage": 0.80,
                     "empirical_coverage": float(((d.p_lo <= d.y) & (d.y <= d.p_hi)).mean()),
                     "mean_width": float((d.p_hi-d.p_lo).mean())},
        "decision": {"fixed": main_metrics["pooled"]["fixed"], "naive": main_metrics["pooled"]["naive"],
                     "lgbm_point": main_metrics["pooled"]["point"], "lgbm_robust": main_metrics["pooled"]["robust"],
                     "oracle": main_metrics["pooled"]["oracle"]},
        "wilcoxon_p_route_day_regret": {"lgbm_point_vs_fixed": main_metrics["wilcoxon_daily_route_level_regret"]["point_vs_fixed"]["p_value"]},
        "fleet_cap_buses": max(v["F_buses"] for v in main_metrics["fleet"].values()),
        "fleet_cap_by_fold": {k: v["F_buses"] for k,v in main_metrics["fleet"].items()},
        "data": {"source": "results_rolling/forecast_test.csv; data/hourly_janmar.csv training-period p99",
                 "routes": [x["pune_id"] for x in mapping["mapped_routes"]], "test_rows": len(d),
                 "horizon_h": 119,
                 "config": {"service_hours_inclusive": [5,21], **PARAMS, "x_max_by_route": xmaxes},
                 "pune_scenario_mapping": True},
    }
    rolling = {}
    for fold, vals in rolling_metrics["fold_metrics"].items():
        # p_fixed is not in the legacy metrics file, so compute it from the same rolling forecasts.
        f = d[d.fold == fold]
        y = f.y.to_numpy(float)
        den = float(np.abs(y).sum())
        wf = float(np.abs(f.p_fixed.to_numpy(float)-y).sum()/den) if den else 0.0
        rolling[fold] = {"wape": {"naive": vals["mapped8"]["seasonal_naive"]["wape"],
                                    "fixed": wf, "model": vals["mapped8"]["model"]["wape"]},
                         "interval_coverage": vals["mapped8"]["interval_80"]["coverage"]}
    metrics["rolling"] = rolling
    out.mkdir(parents=True, exist_ok=True)
    (out/"metrics.json").write_text(json.dumps(metrics, indent=2, allow_nan=False)+"\n", encoding="utf-8")

    # Export every mapped service-hour test row. Keep the mask aligned to the
    # frame being filtered; the prior first_fold mask had a different index.
    preview = d.sort_values(["fold", "timestamp", "route"]).copy()
    sample_times = preview["timestamp"].unique()
    preview = preview[preview["timestamp"].isin(sample_times)].copy()
    sample = [{"timestamp": row.timestamp.isoformat(sep=" "), "route": mapped[row.route], "y": float(row.y),
               "p_point": float(row.p_point), "p_lo": float(row.p_lo), "p_hi": float(row.p_hi),
               "p_naive": float(row.p_naive), "p_fixed": float(row.p_fixed), "fold": str(row.fold)}
              for row in preview.itertuples(index=False)]
    (out/"forecast_sample.json").write_text(json.dumps(sample, indent=2, allow_nan=False)+"\n", encoding="utf-8")

    plan_json = [{"timestamp": row.timestamp.isoformat(sep=" "), "route": mapped[row.route], "plan": row.plan,
                  "x": int(row.x), "cost": float(row.cost), "wait_pmin": float(row.wait_pmin),
                  "overload_pax": float(row.overload_pax), "bus_hours": float(row.bus_hours)}
                 for row in scored.sort_values(["fold", "timestamp", "route", "plan"]).itertuples(index=False)]
    (out/"plans.json").write_text(json.dumps(plan_json, separators=(",", ":"), allow_nan=False)+"\n", encoding="utf-8")

    corridors = config.get("corridors", {})
    summary = route_summary.set_index("route")
    routes_json = []
    for item in mapping["mapped_routes"]:
        route = item["source_route"]
        corridor = corridors.get(item["pune_id"], {})
        routes_json.append({"pune_id": item["pune_id"], "label": corridor.get("name"), "area": None,
                            "type": item["type"], "source_route": route,
                            "source_stats": {"training_boardings": int(item["training_period_boardings"]),
                                             "combined_coverage_pct": float(summary.loc[route,"coverage_combined_pct"])},
                            "mapping_note": "scenario-mapped: ranked on 2018-01-01..2018-02-10"})
    (out/"routes.json").write_text(json.dumps(routes_json, indent=2, allow_nan=False)+"\n", encoding="utf-8")


def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda:f.read(8*1024*1024), b""):
            h.update(block)
    return h.hexdigest()


def main() -> None:
    forecast_path = ROOT/"results_rolling"/"forecast_test.csv"
    mapping_path = ROOT/"data"/"mapping_janmar_v2.json"
    hourly_path = ROOT/"data"/"hourly_janmar.csv"
    rolling_metrics_path = ROOT/"results_rolling"/"metrics.json"
    summary_path = ROOT/"data"/"route_summary_janmar.csv"
    config_path = ROOT/"config"/"cityflow.yaml"
    outdir = ROOT/"results_optimiser_v2"
    dashboard_dir = ROOT/"results_dashboard"
    tradeoff_path = outdir/"tradeoff.json"
    if outdir.exists() and any(outdir.iterdir()):
        raise SystemExit(f"Refusing to overwrite non-empty directory: {outdir}")
    if dashboard_dir.exists() and any(dashboard_dir.iterdir()):
        raise SystemExit(f"Refusing to overwrite non-empty directory: {dashboard_dir}")
    for path in [forecast_path,mapping_path,hourly_path,rolling_metrics_path,summary_path,config_path]:
        if not path.is_file(): raise SystemExit(f"Missing input: {path}")
    import yaml
    mapping=json.loads(mapping_path.read_text(encoding="utf-8"))
    mapped=mapping["mapped_routes"]
    routes=[x["source_route"] for x in mapped]
    if len(routes)!=8 or "SER_9b2d" in routes: raise SystemExit("Mapped route list invalid")
    forecasts=pd.read_csv(forecast_path,parse_dates=["timestamp"])
    forecasts=forecasts[forecasts.route.isin(routes) & forecasts.timestamp.dt.hour.isin(SERVICE_HOURS)].copy()
    if forecasts.duplicated(["fold","timestamp","route"]).any(): raise SystemExit("Duplicate mapped route-hour forecasts")
    expected_folds=7
    if forecasts.fold.nunique()!=expected_folds: raise SystemExit(f"Expected 7 folds, found {forecasts.fold.nunique()}")
    if (forecasts.y<0).any(): raise SystemExit("Negative actual demand")

    # Training-only p99, reused across all folds and all settings.
    raw_train=pd.read_csv(hourly_path,usecols=["route","timestamp","boardings"])
    raw_train["timestamp"]=pd.to_datetime(raw_train.timestamp,errors="coerce")
    raw_train=raw_train[raw_train.route.isin(routes)]
    raw_train=raw_train[(raw_train.timestamp>="2018-01-01")&(raw_train.timestamp<"2018-02-11")&raw_train.timestamp.dt.hour.isin(SERVICE_HOURS)]
    expected=pd.date_range("2018-01-01 05:00","2018-02-10 21:00",freq="h")
    expected=expected[expected.hour.isin(SERVICE_HOURS)]
    p99={}
    for route in routes:
        vals=raw_train[raw_train.route==route].set_index("timestamp").boardings.groupby(level=0).sum().reindex(expected,fill_value=0).to_numpy(float)
        p99[route]=float(np.quantile(vals,.99))
    del raw_train
    xmaxes={r:max(X_FLOOR,int(math.ceil(1.25*p99[r]/(PARAMS["L"]*PARAMS["K"])))) for r in routes}
    print("p99_training_only:",json.dumps(p99,sort_keys=True))
    print("x_max_by_route:",json.dumps(xmaxes,sort_keys=True))

    scored,ctx=optimize_run(forecasts,routes,PARAMS,xmaxes)
    metrics=metrics_for_run(scored,ctx["fleet"],PARAMS)
    metrics["fleet"]=ctx["fleet"]
    metrics["parameters"]={**PARAMS,"x_min":1,"x_max_by_route":xmaxes,"service_hours_inclusive":[5,21],"peak_hours":sorted(PEAK_HOURS),"demand_rounding":"clip below 0; ceil to integer"}
    metrics["plans"]={k:{"demand_column":v} for k,v in PLAN_COLUMNS.items()}
    metrics["row_counts"]={"rows_per_plan":int(len(scored)//len(PLAN_COLUMNS)),"total_plan_rows":int(len(scored)),"folds":7}
    ranking_data=ranking(scored,forecasts,routes)
    metrics["forecast_error_vs_regret_ranking"]=ranking_data
    point_share=metrics["crowded_route_hours"]["point"]["share"]
    metrics["main_run_still_saturated_point_share_above_50pct"]=bool(point_share>.5)
    print("MAIN_POOLED:",json.dumps(metrics["pooled"],sort_keys=True))
    print("MAIN_PER_FOLD:",json.dumps(metrics["per_fold"],sort_keys=True))
    print("MAIN_PEAK_REGRET:",json.dumps(metrics["peak_hours_regret_table"],sort_keys=True))
    print("MAIN_WILCOXON:",json.dumps(metrics["wilcoxon_daily_route_level_regret"],sort_keys=True))
    print("MAIN_RANKING:",json.dumps(ranking_data,sort_keys=True))
    print("MAIN_SANITY:",json.dumps(metrics["sanity_checks"],sort_keys=True))
    print("CROWDED_SHARES:",json.dumps(metrics["crowded_route_hours"],sort_keys=True))
    print("FLEET_BINDING:",json.dumps(metrics["fleet_binding"],sort_keys=True))
    print("POINT_CROWDED_SHARE_ABOVE_50_PERCENT:",point_share>.5)

    # Sensitivity uses training p99 already calculated above; no post-training data enters x_max.
    tradeoff=sensitivity(forecasts,routes,p99,{"ranking":ranking_data})
    outdir.mkdir(parents=True,exist_ok=True)
    (outdir/"plans.csv").write_text(scored[OUT_COLUMNS].to_csv(index=False),encoding="utf-8")
    (outdir/"decision_metrics.json").write_text(json.dumps(metrics,indent=2,allow_nan=False)+"\n",encoding="utf-8")
    (tradeoff_path).write_text(json.dumps(tradeoff,indent=2,allow_nan=False)+"\n",encoding="utf-8")
    print("SENSITIVITY:",json.dumps(tradeoff,sort_keys=True))

    rolling_metrics=json.loads(rolling_metrics_path.read_text(encoding="utf-8"))
    route_summary=pd.read_csv(summary_path)
    config=yaml.safe_load(config_path.read_text(encoding="utf-8"))
    dashboard_exports(scored,forecasts,routes,mapping,route_summary,config,metrics,ranking_data,rolling_metrics,xmaxes,dashboard_dir)

    # Append-only run provenance entry. The result artifacts remain untracked/ignored.
    ledger_path=ROOT/"outputs"/"LEDGER.csv"
    commit=__import__("subprocess").check_output(["git","rev-parse","HEAD"],cwd=ROOT.parent,text=True).strip()
    config_hash=hashlib.sha256(json.dumps({**PARAMS,"x_max_by_route":xmaxes},sort_keys=True).encode()).hexdigest()
    data_hash=hashlib.sha256((sha256(forecast_path)+sha256(hourly_path)).encode()).hexdigest()
    run_id=f"run_{commit[:7]}_optimiser_v2_{data_hash[:12]}"
    row=[run_id,date.today().isoformat(),commit,config_hash,"5","rolling-capacity-sensitivity","",data_hash,"optimise_rolling_v2.py","success","7 folds; mapped8; route-specific x_max; 10 sensitivity runs"]
    with ledger_path.open("a",newline="",encoding="utf-8") as f:
        csv.writer(f).writerow(row)
    print("LEDGER_ROW:",json.dumps(dict(zip(["run_id","date","git_commit","config_hash","phase","protocol","seed","data_hash","script","status","notes"],row)),sort_keys=True))
    print("OUTPUT_SIZES:")
    for folder in [outdir,dashboard_dir]:
        for file in sorted(folder.iterdir()):
            print(f"{file.relative_to(ROOT)} {file.stat().st_size}")


if __name__=="__main__":
    main()
