#!/usr/bin/env python3
"""Protect the Dashboard 1 baseline while CityFlow is developed."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASELINE = "d1-baseline"
ALLOWED_FILES = {
    "AGENTS.md",
    ".gitignore",
    "Makefile",
    "scripts/guard_d1.py",
    "scripts/guard_d1.sh",
}
ALLOWED_PREFIXES = ("BusMate_CityFlow/", "BusMate_Hub/")
FROZEN_PREFIX = "BusMate_CampusSeat/"


def run_git(*args: str) -> bytes:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        message = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed")
    return result.stdout


def changed_paths() -> set[str]:
    diff = run_git("diff", "--name-only", "-z", "--no-renames", BASELINE, "--")
    untracked = run_git("ls-files", "--others", "--exclude-standard", "-z")
    entries = diff.split(b"\0") + untracked.split(b"\0")
    return {entry.decode("utf-8", errors="surrogateescape") for entry in entries if entry}


def gitignore_is_append_only() -> bool:
    baseline = run_git("show", f"{BASELINE}:.gitignore").decode("utf-8").splitlines()
    current_path = ROOT / ".gitignore"
    if not current_path.exists():
        return False
    current = current_path.read_text(encoding="utf-8").splitlines()
    return current[: len(baseline)] == baseline


def main() -> int:
    try:
        run_git("rev-parse", "--verify", f"{BASELINE}^{{commit}}")
        paths = changed_paths()
    except (OSError, RuntimeError) as error:
        print(f"Dashboard 1 guard could not run: {error}", file=sys.stderr)
        return 2

    violations: list[str] = []
    for path in sorted(paths):
        if path.startswith(FROZEN_PREFIX):
            violations.append(f"frozen Dashboard 1 path changed: {path}")
            continue
        if path in ALLOWED_FILES or any(path.startswith(prefix) for prefix in ALLOWED_PREFIXES):
            continue
        violations.append(f"path is outside the allowed set: {path}")

    if not gitignore_is_append_only():
        violations.append("root .gitignore removed, reordered, or modified an existing line")

    if violations:
        print("Dashboard 1 guard failed:", file=sys.stderr)
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1

    print("Dashboard 1 guard passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
