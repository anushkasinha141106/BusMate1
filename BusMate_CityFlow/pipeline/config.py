"""Load, validate, and fingerprint the CityFlow configuration."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "cityflow.yaml"


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(f"Invalid CityFlow configuration: {message}")


def load_config(path: Path = CONFIG_PATH) -> tuple[dict[str, Any], str]:
    raw = path.read_bytes()
    data = yaml.safe_load(raw)
    _require(isinstance(data, dict), "root must be a mapping")

    hours = data.get("service_hours")
    _require(isinstance(hours, dict), "service_hours must be a mapping")
    start, end, count = hours.get("start"), hours.get("end"), hours.get("hours")
    _require(all(isinstance(value, int) for value in (start, end, count)), "service hours must be integers")
    _require(hours.get("inclusive") is True, "service hours must be inclusive")
    _require(end >= start and count == end - start + 1, "service hour count does not match its inclusive range")

    cycle_times = data.get("cycle_time_min")
    corridors = data.get("corridors")
    _require(isinstance(cycle_times, dict) and bool(cycle_times), "cycle_time_min must be a non-empty mapping")
    _require(isinstance(corridors, dict), "corridors must be a mapping")
    _require(set(cycle_times) == set(corridors), "corridors and cycle_time_min must have identical codes")
    _require(all(isinstance(value, int) and value > 0 for value in cycle_times.values()), "cycle times must be positive integers")
    _require(all(isinstance(item, dict) and item.get("name") and item.get("type") for item in corridors.values()), "each corridor needs a name and type")
    _require(data.get("mapping_note") == "scenario-mapped; not checked against PMPML route data", "mapping note is missing or changed")

    departures = data.get("departures")
    _require(isinstance(departures, dict), "departures must be a mapping")
    _require(departures.get("min", 0) > 0, "minimum departures must be positive")
    _require(departures.get("max_primary", 0) >= departures["min"], "primary departure maximum is below the minimum")
    _require(bool(departures.get("max_sweep")), "departure sweep must not be empty")

    weights = data.get("weights")
    _require(isinstance(weights, dict), "weights must be a mapping")
    _require(isinstance(weights.get("w_wait"), (int, float)) and isinstance(weights.get("w_over_primary"), (int, float)), "primary weights must be numeric")
    _require(bool(weights.get("w_over_sweep")) and bool(weights.get("w_op_sweep")), "weight sweeps must not be empty")
    _require("TRAIN days only" in weights.get("w_op_rule", ""), "operating weight rule must use TRAIN days only")

    fleet = data.get("fleet")
    _require(isinstance(fleet, dict), "fleet must be a mapping")
    _require(bool(fleet.get("rule")) and bool(fleet.get("F")), "fleet rule and F definition are required")
    _require(isinstance(fleet.get("tau_primary"), (int, float)), "primary fleet factor must be numeric")
    _require(bool(fleet.get("tau_sweep")), "fleet sweep must not be empty")

    interval = data.get("interval")
    _require(isinstance(interval, dict), "interval must be a mapping")
    _require(0 < interval.get("level", 0) < 1, "interval level must be between zero and one")
    _require(interval.get("method") == "split_conformal_cqr", "unsupported interval method")

    seeds = data.get("seeds")
    _require(isinstance(seeds, list) and bool(seeds), "seeds must be a non-empty list")
    _require(all(isinstance(seed, int) for seed in seeds) and len(seeds) == len(set(seeds)), "seeds must be unique integers")
    _require(isinstance(data.get("pool_size"), int) and data["pool_size"] > 0, "pool_size must be a positive integer")

    return data, hashlib.sha256(raw).hexdigest()


def main() -> None:
    _, config_hash = load_config()
    print(config_hash)


if __name__ == "__main__":
    main()
