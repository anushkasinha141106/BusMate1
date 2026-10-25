"""train_rolling.py - fixed-model rolling-origin evaluation using train.py feature/model helpers."""
import argparse, json, math, os, warnings
from pathlib import Path
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
try:
    from sklearn.ensemble import HistGradientBoostingRegressor
except ImportError:
    HistGradientBoostingRegressor = None
try:
    import lightgbm as lgb
    BACKEND = "lightgbm"
except ImportError:
    BACKEND = "sklearn-HistGradientBoosting (lightgbm not installed)"

SERVICE = range(5, 22)  # scoring hours 05..21 inclusive (17 hours)
PEAK_HOURS = {7, 8, 9, 17, 18, 19}
FIXED_TARGET = "raw"
FIXED_OBJECTIVE = "poisson"
FEATS = ["hour", "dow", "weekend", "how", "lag1", "lag2", "lag4", "lag24", "lag25",
         "lag167", "lag168", "lag169", "roll24", "std24", "same7", "level168",
         "trend3", "yd_ratio", "net1", "share", "route_code"]


# ---------------------------------------------------------------- data
def pick_routes(h, pool_n, min_presence=0.70, extra_exclude=()):
    n_hours = h["timestamp"].nunique()
    pres = h.groupby("route")["timestamp"].nunique() / n_hours
    cand = pres[pres >= min_presence].index
    tot = h[h["route"].isin(cand)].groupby("route")["boardings"].sum().sort_values(ascending=False)
    # data-anomaly rule: a route with > 10x the median volume of the top-20 routes is not a normal route
    ref = float(tot.head(20).median())
    excluded = [r for r in tot.index[:5] if tot[r] > 10 * ref] + [r for r in extra_exclude if r in tot.index]
    excluded = list(dict.fromkeys(excluded))
    tot = tot.drop(excluded)
    ranked = list(tot.index)
    mapped = ranked[:7] + [ranked[-1]]
    tiers = {r: ("trunk" if i < 4 else "mixed" if i < 7 else "feeder") for i, r in enumerate(mapped)}
    pool = list(dict.fromkeys(ranked[:pool_n] + mapped))
    return ranked, mapped, tiers, pool, tot, excluded


def build(h, pool, start, end):
    idx = pd.date_range(start, end, freq="h")
    wide = (h.pivot_table(index="timestamp", columns="route", values="boardings", aggfunc="sum")
              .reindex(idx).fillna(0)[pool])
    gap = ~idx.isin(pd.DatetimeIndex(h["timestamp"].unique()))   # hours with NO data for any route = outage, not zero demand
    wide.loc[gap] = np.nan
    net1 = wide.sum(axis=1, min_count=1).shift(1)
    frames = []
    for k, r in enumerate(pool):
        y = wide[r]; s = y.shift(1)
        f = pd.DataFrame({"timestamp": idx, "route": r, "route_code": k, "y": y.values})
        f["hour"] = idx.hour; f["dow"] = idx.dayofweek
        f["weekend"] = (f["dow"] >= 5).astype(int); f["how"] = f["dow"] * 24 + f["hour"]
        for L in (1, 2, 4, 24, 25, 167, 168, 169):
            f[f"lag{L}"] = y.shift(L).values
        f["roll24"] = s.rolling(24, min_periods=12).mean().values
        f["std24"] = s.rolling(24, min_periods=12).std().values
        f["same7"] = pd.concat([y.shift(24 * d) for d in range(1, 8)], axis=1).mean(axis=1).values
        f["level168"] = s.rolling(168, min_periods=24).mean().values
        f["trend3"] = f["lag1"] - f["lag4"]
        f["yd_ratio"] = f["lag1"] / (f["lag25"] + 1)
        f["net1"] = net1.values
        f["share"] = f["lag1"] / (f["net1"] + 1)
        frames.append(f)
    d = pd.concat(frames, ignore_index=True)
    d = d.dropna(subset=["y", "lag24", "level168"]).reset_index(drop=True)
    d["scale"] = d["level168"].clip(lower=1.0)
    d["day"] = d["timestamp"].dt.normalize()
    return d


# ---------------------------------------------------------------- target forms
def fwd(kind, y, scale):
    return {"raw": y, "ratio": y / scale, "log1p": np.log1p(y)}[kind]


def inv(kind, p, scale):
    p = {"raw": p, "ratio": p * scale, "log1p": np.expm1(p)}[kind]
    return np.clip(p, 0, None)


# ---------------------------------------------------------------- model wrapper
def fit_predict(Xtr, ytr, Xs, objective, seed=42, alpha=None):
    Xtr = Xtr.copy(); Xs = [x.copy() for x in Xs]
    if BACKEND != "lightgbm" and HistGradientBoostingRegressor is None:
        raise SystemExit("Neither lightgbm nor scikit-learn is usable")
    if BACKEND == "lightgbm":
        # native API on plain numpy arrays (avoids pandas/numpy version clashes)
        ci = list(Xtr.columns).index("route_code")
        p = dict(learning_rate=0.05, num_leaves=15, min_data_in_leaf=20,
                 bagging_fraction=0.8, bagging_freq=1, feature_fraction=0.8, seed=seed,
                 verbose=-1, num_threads=4)
        if objective == "l1": p["objective"] = "regression_l1"
        elif objective == "poisson": p["objective"] = "poisson"
        else: p.update(objective="quantile", alpha=alpha)
        Xn = np.ascontiguousarray(Xtr.to_numpy(dtype=np.float64))
        yn = np.ascontiguousarray(np.asarray(ytr, dtype=np.float64))
        ds = lgb.Dataset(Xn, label=yn, categorical_feature=[ci], free_raw_data=False)
        m = lgb.train(p, ds, num_boost_round=400)
        return [m.predict(np.ascontiguousarray(x.to_numpy(dtype=np.float64))) for x in Xs]
    loss = {"l1": "absolute_error", "poisson": "poisson", "quantile": "quantile"}[objective]
    kw = dict(loss=loss, max_iter=300, learning_rate=0.05, max_leaf_nodes=15, random_state=seed,
              categorical_features=[list(Xtr.columns).index("route_code")])
    if objective == "quantile": kw["quantile"] = alpha
    m = HistGradientBoostingRegressor(**kw).fit(Xtr, ytr)
    return [m.predict(x) for x in Xs]


def point_forecast(kind, objective, tr, tests, seeds):
    """Average over seeds; returns list of raw-space predictions, one per frame in `tests`."""
    obj_kind = "raw" if objective == "poisson" else kind
    ytr = fwd(obj_kind, tr["y"].values, tr["scale"].values)
    acc = [np.zeros(len(t)) for t in tests]
    for s in seeds:
        outs = fit_predict(tr[FEATS], ytr, [t[FEATS] for t in tests], objective, seed=s)
        for i, (o, t) in enumerate(zip(outs, tests)):
            acc[i] += inv(obj_kind, o, t["scale"].values) / len(seeds)
    return acc


# ---------------------------------------------------------------- metrics
def score(d, col, peak_mask):
    e = d["y"].values - d[col].values
    sv = d["hour"].isin(SERVICE).values
    return {"n": int(len(d)),
            "mae": float(np.mean(np.abs(e))),
            "rmse": float(np.sqrt(np.mean(e ** 2))),
            "wape": float(np.sum(np.abs(e)) / max(np.sum(d["y"]), 1)),
            "service_mae": float(np.mean(np.abs(e[sv]))),
            "peak_mae": float(np.mean(np.abs(e[peak_mask.values])))}


def day_bootstrap(d, colA, colB, B=2000, seed=0):
    """Mean service-hour |err|(A) - |err|(B) per day, resampling whole days. Negative = A better."""
    s = d[d["hour"].isin(SERVICE)].copy()
    s["diff"] = np.abs(s["y"] - s[colA]) - np.abs(s["y"] - s[colB])
    per_day = s.groupby("day")["diff"].mean().values
    rng = np.random.default_rng(seed)
    bs = [per_day[rng.integers(0, len(per_day), len(per_day))].mean() for _ in range(B)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    return {"mean_diff": float(per_day.mean()), "ci95": [float(lo), float(hi)], "n_days": int(len(per_day)),
            "reliably_better": bool(hi < 0)}


def hist_avg(train_df, target_df):
    m = train_df.groupby(["route", "how"])["y"].mean()
    key = pd.MultiIndex.from_arrays([target_df["route"], target_df["how"]])
    return m.reindex(key).values


# ---------------------------------------------------------------- rolling evaluation

def metric_set(frame):
    scored = frame[frame["hour"].isin(SERVICE)]
    out = {"n_service_rows": int(len(scored))}
    for label, col in (("seasonal_naive", "p_naive"), ("historical_average", "p_fixed"), ("model", "p_point")):
        err = scored["y"].to_numpy(dtype=float) - scored[col].to_numpy(dtype=float)
        out[label] = {"mae": float(np.mean(np.abs(err))),
                      "rmse": float(np.sqrt(np.mean(err ** 2))),
                      "wape": float(np.sum(np.abs(err)) / max(float(scored["y"].sum()), 1.0))}
    peak = scored[scored["hour"].isin(PEAK_HOURS)]
    inside = (scored["y"] >= scored["p_lo"]) & (scored["y"] <= scored["p_hi"])
    peak_inside = (peak["y"] >= peak["p_lo"]) & (peak["y"] <= peak["p_hi"])
    out["interval_80"] = {
        "coverage": float(inside.mean()),
        "mean_width": float((scored["p_hi"] - scored["p_lo"]).mean()),
        "peak_coverage": float(peak_inside.mean()),
        "peak_mean_width": float((peak["p_hi"] - peak["p_lo"]).mean()),
        "peak_n": int(len(peak))}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hourly", required=True)
    ap.add_argument("--mapping", required=True)
    ap.add_argument("--out", default="results_rolling")
    ap.add_argument("--backend", choices=["auto", "sklearn"], default="auto")
    ap.add_argument("--seeds", type=int, nargs="+", default=[42, 43, 44])
    a = ap.parse_args()
    out_path = Path(a.out)
    if out_path.exists() and (not out_path.is_dir() or any(out_path.iterdir())):
        raise SystemExit(f"Output path already contains files; refusing to overwrite: {a.out}")
    global BACKEND
    if a.backend == "sklearn":
        BACKEND = "sklearn-HistGradientBoosting (forced)"
    os.makedirs(a.out, exist_ok=True)
    mapping_doc = json.load(open(a.mapping, encoding="utf-8"))
    mapped_records = mapping_doc["mapped_routes"]
    mapped = [x["source_route"] for x in mapped_records]
    labels = [x["pune_id"] for x in mapped_records]
    if len(mapped) != 8 or len(set(mapped)) != 8 or labels != [f"P0{i}" for i in range(1, 9)]:
        raise SystemExit("Mapping must contain unique P01-P08 source routes")
    ranked = [x["route"] for x in mapping_doc["candidate_routes_ranked_by_training_period_boardings"]]
    pool = list(dict.fromkeys(ranked[:40] + mapped))
    if "SER_9b2d" in mapped or "SER_9b2d" in ranked or "SER_9b2d" in pool:
        raise SystemExit("SER_9b2d must be absent from candidate, mapped, and pooled routes")

    h = pd.read_csv(a.hourly, parse_dates=["timestamp"])
    h = h[h["route"].astype(str) != "SER_9b2d"].copy()
    missing = set(pool) - set(h["route"].astype(str))
    if missing:
        raise SystemExit(f"Pool routes missing from hourly input: {sorted(missing)}")
    print(f"backend: {BACKEND}", flush=True)
    print(f"fixed target={FIXED_TARGET}; fixed objective={FIXED_OBJECTIVE}; seeds={a.seeds}", flush=True)
    print(f"scoring hours: 05-21; fixed peak hours: 07-09 and 17-19", flush=True)
    print(f"mapped routes: {dict(zip(labels, mapped))}; pool size={len(pool)}", flush=True)

    end = h["timestamp"].max().normalize() + pd.Timedelta(hours=23)
    start = h["timestamp"].min().normalize()
    d = build(h, pool, start, end)
    folds = [
        ("fold1", "2018-02-11"), ("fold2", "2018-02-18"),
        ("fold3", "2018-02-25"), ("fold4", "2018-03-04"),
        ("fold5", "2018-03-11"), ("fold6", "2018-03-18"),
        ("fold7", "2018-03-25")]
    fold_outputs = []
    fold_metrics = {}
    fold_counts = {}
    fold_mapped_lists = []
    sanity_no_overlap = True
    for fold, test_day in folds:
        te0 = pd.Timestamp(test_day)
        cal0 = te0 - pd.Timedelta(days=7)
        te_end_excl = te0 + pd.Timedelta(days=7)
        tr = d[d.timestamp < cal0].copy()
        ca = d[(d.timestamp >= cal0) & (d.timestamp < te0)].copy()
        te = d[(d.timestamp >= te0) & (d.timestamp < te_end_excl)].copy()
        if tr.empty or ca.empty or te.empty:
            raise SystemExit(f"Empty split in {fold}")
        overlap_ok = (tr.timestamp.max() < cal0 and ca.timestamp.min() >= cal0 and
                      ca.timestamp.max() < te0 and te.timestamp.min() >= te0 and
                      te.timestamp.max() < te_end_excl)
        sanity_no_overlap &= bool(overlap_ok)
        if not overlap_ok:
            raise SystemExit(f"Train/calibration/test date boundary failure in {fold}")
        print(f"\n{fold}: train {start.date()}..{(cal0-pd.Timedelta(days=1)).date()} rows={len(tr)}; "
              f"calibration {cal0.date()}..{(te0-pd.Timedelta(days=1)).date()} rows={len(ca)}; "
              f"test {te0.date()}..{(te_end_excl-pd.Timedelta(days=1)).date()} rows={len(te)}; "
              f"test_service_rows={int(te.hour.isin(SERVICE).sum())}", flush=True)

        # Fixed raw/Poisson point model; fit on all observations before this test week.
        prior = pd.concat([tr, ca], ignore_index=True)
        p_point = point_forecast(FIXED_TARGET, FIXED_OBJECTIVE, prior, [te], a.seeds)[0]
        p_fixed = pd.Series(hist_avg(prior, te), index=te.index)
        p_naive = te["lag168"].fillna(p_fixed)
        p_fixed = p_fixed.fillna(p_naive)
        if np.isnan(p_point).any() or p_fixed.isna().any() or p_naive.isna().any():
            raise SystemExit(f"Missing forecast value in {fold}")

        ytr = fwd(FIXED_TARGET, tr["y"].to_numpy(), tr["scale"].to_numpy())
        lo_c, lo_t = fit_predict(tr[FEATS], ytr, [ca[FEATS], te[FEATS]], "quantile", seed=42, alpha=0.10)
        hi_c, hi_t = fit_predict(tr[FEATS], ytr, [ca[FEATS], te[FEATS]], "quantile", seed=42, alpha=0.90)
        # Apply the prescribed order correction to both calibration and test quantiles.
        cal_reordered = lo_c > hi_c
        test_reordered = lo_t > hi_t
        raw_lo_c, raw_hi_c = np.minimum(lo_c, hi_c), np.maximum(lo_c, hi_c)
        raw_lo_t, raw_hi_t = np.minimum(lo_t, hi_t), np.maximum(lo_t, hi_t)
        scores = np.maximum(raw_lo_c - ca["y"].to_numpy(), ca["y"].to_numpy() - raw_hi_c)
        n = len(scores); level = 0.80
        qhat = float(np.quantile(scores, min(1.0, math.ceil((n + 1) * level) / n), method="higher"))
        print(f"  quantile reorder rows: calibration={int(cal_reordered.sum())}; test={int(test_reordered.sum())}", flush=True)
        print(f"  q_hat={qhat:.12f}; calibration coverage before={np.mean((ca['y'].to_numpy() >= raw_lo_c) & (ca['y'].to_numpy() <= raw_hi_c)):.6f}; "
              f"after={np.mean((ca['y'].to_numpy() >= np.maximum(raw_lo_c-qhat,0)) & (ca['y'].to_numpy() <= np.maximum(raw_hi_c+qhat,0))):.6f}; "
              f"q_hat calibration hours=all hours", flush=True)
        if qhat < 0:
            raise SystemExit(f"NEGATIVE_QHAT_STOP {fold}: q_hat={qhat:.12f}")
        hi_before_clip = raw_hi_t + qhat
        hi_clipped = hi_before_clip <= 0
        clipped_hours = te.loc[hi_clipped, "hour"].value_counts().sort_index().to_dict()
        print(f"  p_hi clipped to 0 rows={int(hi_clipped.sum())}; hours_of_day={clipped_hours}", flush=True)
        frame = te[["timestamp", "route", "y", "hour"]].copy()
        frame.insert(0, "fold", fold)
        frame["p_point"] = p_point
        frame["p_lo"] = np.maximum(raw_lo_t - qhat, 0)
        frame["p_hi"] = np.maximum(raw_hi_t + qhat, 0)
        frame["p_naive"] = p_naive.to_numpy()
        frame["p_fixed"] = p_fixed.to_numpy()
        if (frame["p_lo"] > frame["p_hi"]).any():
            raise SystemExit(f"Invalid interval ordering in {fold}")
        fold_outputs.append(frame)
        fold_mapped_lists.append(tuple(mapped))
        mapped_frame = frame[frame.route.isin(mapped)]
        fold_metrics[fold] = {"mapped8": metric_set(mapped_frame), "pool": metric_set(frame)}
        fold_counts[fold] = {"train_rows": int(len(tr)), "calibration_rows": int(len(ca)),
                             "test_rows": int(len(te)), "test_service_rows": int(te.hour.isin(SERVICE).sum()),
                             "train_start": str(start.date()), "train_end": str((cal0-pd.Timedelta(days=1)).date()),
                             "calibration_start": str(cal0.date()), "calibration_end": str((te0-pd.Timedelta(days=1)).date()),
                             "test_start": str(te0.date()), "test_end": str((te_end_excl-pd.Timedelta(days=1)).date()),
                             "calibration_rows_actual": int(len(ca)), "qhat": qhat}
        for scope, subset in (("mapped8", mapped_frame), ("pool", frame)):
            met = fold_metrics[fold][scope]
            print(f"  {scope} service n={met['n_service_rows']}; "
                  f"naive MAE/RMSE/WAPE={met['seasonal_naive']['mae']:.3f}/{met['seasonal_naive']['rmse']:.3f}/{met['seasonal_naive']['wape']:.6f}; "
                  f"fixed MAE/RMSE/WAPE={met['historical_average']['mae']:.3f}/{met['historical_average']['rmse']:.3f}/{met['historical_average']['wape']:.6f}; "
                  f"model MAE/RMSE/WAPE={met['model']['mae']:.3f}/{met['model']['rmse']:.3f}/{met['model']['wape']:.6f}; "
                  f"interval coverage/width={met['interval_80']['coverage']:.6f}/{met['interval_80']['mean_width']:.3f}; "
                  f"peak coverage/width={met['interval_80']['peak_coverage']:.6f}/{met['interval_80']['peak_mean_width']:.3f}", flush=True)

    forecasts = pd.concat(fold_outputs, ignore_index=True)
    forecasts = forecasts[["fold", "timestamp", "route", "y", "p_point", "p_lo", "p_hi", "p_naive", "p_fixed", "hour"]]
    if "SER_9b2d" in set(forecasts.route.astype(str)):
        raise SystemExit("SER_9b2d appeared in forecasts")
    if len(set(fold_mapped_lists)) != 1:
        raise SystemExit("Mapped route set changed across folds")
    if pd.Timestamp(fold_counts["fold7"]["test_start"]) != pd.Timestamp("2018-03-25") or pd.Timestamp(fold_counts["fold7"]["test_end"]) != pd.Timestamp("2018-03-31"):
        raise SystemExit("Last fold dates differ from required week")
    # Structural causality check: build() uses only positive shifts and rolling windows over y.shift(1).
    import inspect
    build_source = inspect.getsource(build)
    feature_causal = ("shift(-" not in build_source and "s = y.shift(1)" in build_source and
                      "y.shift(24 * d) for d in range(1, 8)" in build_source and
                      all(v > 0 for v in (1, 2, 4, 24, 25, 167, 168, 169)))
    if not feature_causal:
        raise SystemExit("Feature causality source check failed")

    print("\nPOOLED OVER ALL 7 TEST WEEKS (metrics scored on service hours 05-21):", flush=True)
    pooled_metrics = {}
    for scope, frame in (("mapped8", forecasts[forecasts.route.isin(mapped)]), ("pool", forecasts)):
        pooled_metrics[scope] = metric_set(frame)
        met = pooled_metrics[scope]
        print(f"{scope} n={met['n_service_rows']}; "
              f"naive MAE/RMSE/WAPE={met['seasonal_naive']['mae']:.3f}/{met['seasonal_naive']['rmse']:.3f}/{met['seasonal_naive']['wape']:.6f}; "
              f"fixed MAE/RMSE/WAPE={met['historical_average']['mae']:.3f}/{met['historical_average']['rmse']:.3f}/{met['historical_average']['wape']:.6f}; "
              f"model MAE/RMSE/WAPE={met['model']['mae']:.3f}/{met['model']['rmse']:.3f}/{met['model']['wape']:.6f}; "
              f"interval coverage/width={met['interval_80']['coverage']:.6f}/{met['interval_80']['mean_width']:.3f}; "
              f"peak coverage/width={met['interval_80']['peak_coverage']:.6f}/{met['interval_80']['peak_mean_width']:.3f}", flush=True)

    per_route = {}
    mapped_forecasts = forecasts[forecasts.route.isin(mapped) & forecasts.hour.isin(SERVICE)]
    for route, g in mapped_forecasts.groupby("route"):
        denom = max(float(g.y.sum()), 1.0)
        per_route[str(route)] = {"model_wape": float(np.abs(g.y-g.p_point).sum()/denom),
                                 "seasonal_naive_wape": float(np.abs(g.y-g.p_naive).sum()/denom),
                                 "service_rows": int(len(g))}
    print("PER MAPPED ROUTE WAPE POOLED OVER FOLDS (model,seasonal_naive):", flush=True)
    for route in mapped:
        v=per_route[route]
        print(f"{route},{v['model_wape']:.6f},{v['seasonal_naive_wape']:.6f},n={v['service_rows']}",flush=True)

    fold_diffs = {}
    for scope in ("mapped8", "pool"):
        diffs=[fold_metrics[f][scope]["model"]["wape"]-fold_metrics[f][scope]["seasonal_naive"]["wape"] for f,_ in folds]
        fold_diffs[scope]={"model_minus_seasonal_naive_wape":diffs,
                           "folds_model_beats_naive":sum(d<0 for d in diffs),
                           "mean_difference":float(np.mean(diffs)),
                           "min_difference":float(np.min(diffs)),"max_difference":float(np.max(diffs))}
        print(f"FOLD WAPE DIFFERENCE model-naive ({scope}): beats={fold_diffs[scope]['folds_model_beats_naive']}/7; "
              f"mean={fold_diffs[scope]['mean_difference']:.6f}; min={fold_diffs[scope]['min_difference']:.6f}; max={fold_diffs[scope]['max_difference']:.6f}",flush=True)

    totals={"train_rows_sum_across_folds":sum(x["train_rows"] for x in fold_counts.values()),
            "calibration_rows_sum_across_folds":sum(x["calibration_rows"] for x in fold_counts.values()),
            "test_rows_sum_across_folds":sum(x["test_rows"] for x in fold_counts.values()),
            "pooled_test_date_span":[fold_counts["fold1"]["test_start"],fold_counts["fold7"]["test_end"]],
            "note":"training/calibration counts are sums across folds; blocks overlap across origins"}
    checks={"no_train_or_calibration_row_in_its_test_week":sanity_no_overlap,
            "no_lag_or_rolling_feature_uses_future_timestamp":feature_causal,
            "SER_9b2d_absent_from_forecasts":"SER_9b2d" not in set(forecasts.route.astype(str)),
            "same_8_mapped_routes_all_folds":len(set(fold_mapped_lists))==1,
            "last_fold_test_dates_2018_03_25_to_2018_03_31":fold_counts["fold7"]["test_start"]=="2018-03-25" and fold_counts["fold7"]["test_end"]=="2018-03-31"}
    if not all(checks.values()): raise SystemExit(f"SANITY_CHECK_FAILED: {checks}")
    forecasts[["fold", "timestamp", "route", "y", "p_point", "p_lo", "p_hi", "p_naive", "p_fixed"]].to_csv(os.path.join(a.out,"forecast_test.csv"),index=False)
    report={"backend":BACKEND,"fixed_target":FIXED_TARGET,"fixed_objective":FIXED_OBJECTIVE,"seeds":a.seeds,
            "scoring_hours_inclusive":[5,21],"peak_hours":[7,8,9,17,18,19],"mapping_file":a.mapping,
            "mapped_routes":dict(zip(labels,mapped)),"pool_size":len(pool),"folds":fold_counts,
            "fold_metrics":fold_metrics,"pooled_metrics":pooled_metrics,"per_mapped_route_wape":per_route,
            "fold_wape_differences":fold_diffs,"pooled_row_counts":totals,"sanity_checks":checks}
    json.dump(report,open(os.path.join(a.out,"metrics.json"),"w"),indent=2)
    print("SANITY CHECKS:",checks,flush=True)
    print(f"Pooled row counts (sums across folds): {totals}",flush=True)
    print(f"wrote {a.out}/forecast_test.csv and {a.out}/metrics.json",flush=True)


if __name__ == "__main__":
    main()
