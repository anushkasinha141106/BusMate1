"""
aggregate.py - raw UrbanBus CSV -> hourly boardings per route.

Usage (PowerShell, from the folder holding the CSV):
    python aggregate.py --csv BUS_DATA_MAR_2018.csv --out hourly_urbanbus.csv

First run it with --inspect to see the columns (reads only 5 rows):
    python aggregate.py --csv BUS_DATA_MAR_2018.csv --inspect

If auto-detection picks the wrong columns, set them yourself:
    --route-col NAME --time-col NAME            (one datetime column)
    --route-col NAME --date-col NAME --time-col NAME   (separate date and time)
"""
import argparse, hashlib, sys, time
import pandas as pd


def guess(cols, *needles, exclude=()):
    for c in cols:
        lc = c.lower()
        if all(n in lc for n in needles) and not any(e in lc for e in exclude):
            return c
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="hourly_urbanbus.csv")
    ap.add_argument("--route-col")
    ap.add_argument("--date-col")
    ap.add_argument("--time-col")
    ap.add_argument("--chunk", type=int, default=500_000)
    ap.add_argument("--inspect", action="store_true")
    a = ap.parse_args()

    head = pd.read_csv(a.csv, nrows=5)
    print("COLUMNS:", list(head.columns))
    print(head.to_string())
    print(head.dtypes)
    if a.inspect:
        return

    cols = list(head.columns)
    route = a.route_col or guess(cols, "route", exclude=("end",))
    tcol = a.time_col or guess(cols, "start", "time") or guess(cols, "time") or guess(cols, "date")
    dcol = a.date_col
    if not dcol and not a.time_col:
        # separate date column next to a time column?
        d = guess(cols, "start", "date") or guess(cols, "date")
        if d and d != tcol:
            dcol = d
    if not route or not tcol:
        sys.exit(f"Could not detect columns. Pass --route-col / --time-col (/ --date-col). Columns: {cols}")
    use = [route, tcol] + ([dcol] if dcol else [])
    print(f"USING route={route!r} time={tcol!r} date={dcol!r}")

    def hour_key(df):
        s = df[tcol].astype(str)
        if dcol:
            s = df[dcol].astype(str).str.slice(0, 10) + " " + s.str.extract(r"(\d{1,2}):")[0].str.zfill(2).fillna("xx")
            s = s.str.slice(0, 13)
        else:
            s = s.str.slice(0, 13)
        return s

    parts, rows_read, dropped_null, dropped_bad = [], 0, 0, 0
    t0 = time.time()
    for i, ch in enumerate(pd.read_csv(a.csv, usecols=use, chunksize=a.chunk, dtype=str)):
        rows_read += len(ch)
        null = ch[route].isna() | ch[tcol].isna()
        dropped_null += int(null.sum())
        ch = ch[~null]
        key = hour_key(ch)
        ts = pd.to_datetime(key, format="%Y-%m-%d %H", errors="coerce")
        bad = ts.isna()
        dropped_bad += int(bad.sum())
        g = pd.DataFrame({"route": ch[route][~bad].values, "timestamp": ts[~bad].values}) \
              .groupby(["route", "timestamp"]).size()
        parts.append(g)
        if len(parts) >= 20:
            parts = [pd.concat(parts).groupby(level=[0, 1]).sum()]
        if (i + 1) % 20 == 0:
            print(f"chunk {i+1}: rows read {rows_read:,}  elapsed {time.time()-t0:,.0f}s", flush=True)

    total = pd.concat(parts).groupby(level=[0, 1]).sum()
    counted = int(total.sum())
    print(f"rows read    : {rows_read:,}")
    print(f"dropped null : {dropped_null:,}")
    print(f"dropped bad  : {dropped_bad:,} (timestamp not parseable as YYYY-MM-DD HH)")
    print(f"counted      : {counted:,}")
    assert counted + dropped_null + dropped_bad == rows_read, "RECONCILIATION FAILED"
    print("reconciliation: counted + dropped == read  OK")

    out = total.rename("boardings").reset_index()
    out.to_csv(a.out, index=False)
    print("date range:", out["timestamp"].min(), "to", out["timestamp"].max())
    print("routes:", out["route"].nunique())
    print("sha256:", hashlib.sha256(open(a.out, "rb").read()).hexdigest())
    print(f"done in {time.time()-t0:,.0f}s")


if __name__ == "__main__":
    main()
