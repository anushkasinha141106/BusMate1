"""
train.py - pooled hourly bus-demand forecaster with honest evaluation.

    pip install pandas numpy scipy lightgbm
    python train.py --hourly hourly_urbanbus.csv --out results

What it does (all chronological, nothing tuned on the test days):
  1. Keeps routes present in >=70% of hours; ranks by volume; maps the 8 scenario
     routes (trunk = ranks 1-4, mixed = 5-7, feeder = lowest) and pools the top
     --pool routes for TRAINING (more rows than 8 routes alone).
  2. Features known at t-1 only (lags, rolling, same-hour history, network total...).
  3. Compares target forms (raw / ratio to trailing mean / log1p / Poisson) on the
     CALIBRATION block (19-24 Mar) - never on the test block.
  4. Optional blend with seasonal naive, weight chosen on the calibration block.
  5. 80% split-conformal quantile (CQR) intervals, calibrated on 19-24 Mar.
  6. FINAL TEST 25-31 Mar evaluated once: MAE, RMSE, WAPE, service-hour MAE,
     peak-hour MAE, coverage, width, and a day-block bootstrap vs both baselines.
Writes metrics.json and forecast_test.csv. Every number in your slides should
come from metrics.json.
"""
import argparse, json, math, os, warnings
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

SERVICE = range(5, 23)  # hours 5..22 inclusive (18 hours)
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


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hourly", required=True)
    ap.add_argument("--out", default="results")
    ap.add_argument("--pool", type=int, default=40)
    ap.add_argument("--cal-start", default="2018-03-19")
    ap.add_argument("--test-start", default="2018-03-25")
    ap.add_argument("--backend", choices=["auto", "sklearn"], default="auto")
    ap.add_argument("--exclude", nargs="*", default=[])
    ap.add_argument("--seeds", type=int, nargs="+", default=[42, 43, 44])
    a = ap.parse_args()
    global BACKEND
    if a.backend == "sklearn":
        BACKEND = "sklearn-HistGradientBoosting (forced)"
    os.makedirs(a.out, exist_ok=True)

    h = pd.read_csv(a.hourly, parse_dates=["timestamp"])
    ranked, mapped, tiers, pool, tot, excluded = pick_routes(h, a.pool, extra_exclude=a.exclude)
    print(f"backend: {BACKEND}")
    print(f"candidate routes (>=70% of hours): {len(ranked)}; pool: {len(pool)}")
    print("EXCLUDED as data anomaly (volume > 10x median of top-20):", excluded,
          {r: int(h[h.route == r].boardings.sum()) for r in excluded})
    print("mapped 8 routes:", {f"P0{i+1}": (r, tiers[r]) for i, r in enumerate(mapped)})

    full_idx = pd.date_range(h["timestamp"].min().normalize(), h["timestamp"].max().normalize() + pd.Timedelta(hours=23), freq="h")
    gap_hours = [str(t) for t in full_idx[~full_idx.isin(pd.DatetimeIndex(h["timestamp"].unique()))]]
    print(f"hours with no data for ANY route (treated as missing, not zero): {len(gap_hours)}", gap_hours)
    d = build(h, pool, h["timestamp"].min().normalize(), h["timestamp"].max().normalize() + pd.Timedelta(hours=23))
    cal0, te0 = pd.Timestamp(a.cal_start), pd.Timestamp(a.test_start)
    tr, ca, te = d[d.timestamp < cal0], d[(d.timestamp >= cal0) & (d.timestamp < te0)], d[d.timestamp >= te0]
    print(f"rows  train {len(tr)}  calibration {len(ca)}  test {len(te)}  (test days: {te['day'].nunique()})")
    assert tr.timestamp.max() < ca.timestamp.min() <= ca.timestamp.max() < te.timestamp.min()

    # peak hours per route = top 3 service hours by TRAIN mean demand
    pk = (tr[tr.hour.isin(SERVICE)].groupby(["route", "hour"])["y"].mean().reset_index()
            .sort_values(["route", "y"], ascending=[True, False]).groupby("route").head(3))
    peak_set = set(zip(pk["route"], pk["hour"]))
    def pmask(df): return pd.Series([(r, hh) in peak_set for r, hh in zip(df["route"], df["hour"])], index=df.index)

    # baselines
    ca = ca.copy(); te = te.copy()
    ca["hist"] = hist_avg(tr, ca)                                   # train only
    te["hist"] = hist_avg(pd.concat([tr, ca]), te)                  # everything before test
    for df_ in (ca, te):
        df_["naive"] = df_["lag168"].fillna(df_["hist"])
        df_["hist"] = df_["hist"].fillna(df_["naive"])

    # ---- model selection on the CALIBRATION block only
    configs = [("raw", "l1"), ("ratio", "l1"), ("log1p", "l1"), ("raw", "poisson")]
    sel = []
    for kind, obj in configs:
        p = point_forecast(kind, obj, tr, [ca], [42])[0]
        c = ca.assign(pred=p)
        sel.append({"target": kind, "objective": obj, **score(c, "pred", pmask(c))})
        print(f"  select {kind:6s} {obj:8s} cal service-MAE {sel[-1]['service_mae']:.2f}")
    best_mae = min(s["service_mae"] for s in sel)
    chosen = next(s for s in sel if s["service_mae"] <= best_mae * 1.01)  # ties within 1% -> earliest/simplest
    kind, obj = chosen["target"], chosen["objective"]
    print(f"chosen: target={kind} objective={obj}")

    # ---- blend weight with seasonal naive (calibration block, train-only model)
    pc = point_forecast(kind, obj, tr, [ca], [42])[0]
    ws = np.linspace(0, 1, 11)
    wm = []
    for w in ws:
        c = ca.assign(b=w * pc + (1 - w) * ca["naive"].values)
        wm.append(score(c, "b", pmask(c))["service_mae"])
    w_best = float(ws[int(np.argmin(wm))])
    use_blend = min(wm) < 0.99 * score(ca.assign(b=pc), "b", pmask(ca))["service_mae"]
    print(f"blend weight on model={w_best:.1f}; blend used for headline: {use_blend}")

    # ---- FINAL point forecasts: refit on train+calibration (all data before test)
    full = pd.concat([tr, ca.drop(columns=["hist", "naive"])])
    pt = point_forecast(kind, obj, full, [te], a.seeds)[0]
    te["model"] = pt
    te["blend"] = w_best * pt + (1 - w_best) * te["naive"].values
    te["headline"] = te["blend"] if use_blend else te["model"]

    # ---- CQR 80% interval: quantile models on train, calibrate on cal block
    qk = "raw" if obj == "poisson" else kind
    ytr = fwd(qk, tr["y"].values, tr["scale"].values)
    lo_c, lo_t = fit_predict(tr[FEATS], ytr, [ca[FEATS], te[FEATS]], "quantile", 42, alpha=0.10)
    hi_c, hi_t = fit_predict(tr[FEATS], ytr, [ca[FEATS], te[FEATS]], "quantile", 42, alpha=0.90)
    lo_c, hi_c = inv(qk, lo_c, ca["scale"].values), inv(qk, hi_c, ca["scale"].values)
    lo_t, hi_t = inv(qk, lo_t, te["scale"].values), inv(qk, hi_t, te["scale"].values)
    scores = np.maximum(lo_c - ca["y"].values, ca["y"].values - hi_c)
    n = len(scores); level = 0.80
    qhat = float(np.quantile(scores, min(1.0, math.ceil((n + 1) * level) / n), method="higher"))
    te["lo"] = np.clip(lo_t - qhat, 0, None); te["hi"] = hi_t + qhat
    inside = (te["y"] >= te["lo"]) & (te["y"] <= te["hi"])

    # ---- report
    mapped_mask = te["route"].isin(mapped)
    res = {"backend": BACKEND, "chosen": {"target": kind, "objective": obj, "blend_weight_model": w_best,
                                          "blend_used": bool(use_blend), "seeds": a.seeds},
           "protocol": {"train_end": str(cal0 - pd.Timedelta(hours=1)), "calibration": [str(cal0), str(te0 - pd.Timedelta(hours=1))],
                        "test_start": str(te0), "rows": {"train": len(tr), "cal": len(ca), "test": len(te)},
                        "route_selection": "volume rank over the whole month; anomaly routes excluded first",
                        "excluded_routes": excluded, "gap_hours": gap_hours},
           "mapped_routes": {f"P0{i+1}": {"source": r, "tier": tiers[r]} for i, r in enumerate(mapped)},
           "model_selection_on_calibration": sel, "test": {}}
    for scope, m in (("mapped8", mapped_mask), ("pooled", pd.Series(True, index=te.index))):
        sub = te[m]
        res["test"][scope] = {c: score(sub, c, pmask(sub)) for c in ("hist", "naive", "model", "blend", "headline")}
        res["test"][scope]["bootstrap_headline_vs_naive"] = day_bootstrap(sub, "headline", "naive")
        res["test"][scope]["bootstrap_headline_vs_hist"] = day_bootstrap(sub, "headline", "hist")
        ins = inside[m]; sv = sub["hour"].isin(SERVICE)
        res["test"][scope]["interval"] = {
            "target": level, "coverage": float(ins.mean()), "mean_width": float((sub["hi"] - sub["lo"]).mean()),
            "coverage_peak": float(ins[pmask(sub)].mean()), "coverage_service": float(ins[sv].mean()),
            "coverage_by_day": {str(k.date()): float(v) for k, v in ins.groupby(sub["day"]).mean().items()},
            "width_over_median_demand": float((sub["hi"] - sub["lo"]).mean() / max(sub["y"].median(), 1))}
    res["test"]["mapped8"]["per_route_service_mae"] = {
        r: {"headline": float(np.mean(np.abs(g.loc[g.hour.isin(SERVICE), "y"] - g.loc[g.hour.isin(SERVICE), "headline"]))),
            "naive": float(np.mean(np.abs(g.loc[g.hour.isin(SERVICE), "y"] - g.loc[g.hour.isin(SERVICE), "naive"])))}
        for r, g in te[mapped_mask].groupby("route")}
    res["cqr_qhat"] = qhat

    json.dump(res, open(os.path.join(a.out, "metrics.json"), "w"), indent=2)
    te[["route", "timestamp", "y", "headline", "model", "naive", "hist", "lo", "hi"]].rename(columns={"y": "actual"}) \
      .to_csv(os.path.join(a.out, "forecast_test.csv"), index=False)

    print("\n=========== FINAL TEST (25-31 Mar), evaluated once ===========")
    for scope in ("mapped8", "pooled"):
        print(f"\n[{scope}]            MAE    RMSE   WAPE  service-MAE  peak-MAE")
        for c in ("hist", "naive", "model", "blend", "headline"):
            s = res["test"][scope][c]
            print(f"  {c:9s}      {s['mae']:7.2f} {s['rmse']:7.2f} {s['wape']:6.3f} {s['service_mae']:10.2f} {s['peak_mae']:9.2f}")
        for k in ("bootstrap_headline_vs_naive", "bootstrap_headline_vs_hist"):
            b = res["test"][scope][k]
            verdict = "RELIABLY better" if b["reliably_better"] else "no reliable difference"
            print(f"  {k}: diff {b['mean_diff']:+.2f}  95% CI [{b['ci95'][0]:+.2f}, {b['ci95'][1]:+.2f}] over {b['n_days']} days -> {verdict}")
        i = res["test"][scope]["interval"]
        print(f"  80% interval: coverage {i['coverage']:.3f} (peak {i['coverage_peak']:.3f}), mean width {i['mean_width']:.1f}")
    print(f"\nwrote {a.out}/metrics.json and {a.out}/forecast_test.csv")


if __name__ == "__main__":
    main()
