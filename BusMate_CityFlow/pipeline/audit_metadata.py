"""Run and record a reproducible, non-data CampusSeat build audit."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from shutil import copyfile
from typing import Any

import yaml

from config import load_config


CITYFLOW = Path(__file__).resolve().parents[1]
REPO = CITYFLOW.parent
CAMPUSSEAT = REPO / "BusMate_CampusSeat"
OUTPUTS = CITYFLOW / "outputs"
LEDGER = OUTPUTS / "LEDGER.csv"
SOURCES = {
    "TopAccessibilityBar": "src/components/layout/TopAccessibilityBar.jsx",
    "A11yModal": "src/components/accessibility/A11yModal.jsx",
    "A11yFloatingBadge": "src/components/accessibility/A11yFloatingBadge.jsx",
    "AdhdReadingMask": "src/components/accessibility/AdhdReadingMask.jsx",
    "ErrorBoundary": "src/components/common/ErrorBoundary.jsx",
    "AccessibilityContext": "src/context/AccessibilityContext.jsx",
    "TranslationContext": "src/context/TranslationContext.jsx",
    "tailwind.config.js": "tailwind.config.js",
    "postcss.config.js": "postcss.config.js",
    "src/index.css": "src/index.css",
    "index.html": "index.html",
}


def run(command: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)


def summarize(raw_stdout: str, run_id: str, commit: str, config_hash: str, status: str) -> dict[str, Any]:
    chunks: list[dict[str, Any]] = []
    build_modules = None
    build_seconds = None
    npm_packages_added = None
    npm_packages_audited = None
    npm_vulnerabilities: dict[str, int] | None = None
    for line in raw_stdout.splitlines():
        match = re.search(
            r"dist/(\S+)\s+([0-9,.]+)\s+(kB|MB).*?gzip:\s*([0-9,.]+)\s+(kB|MB)",
            line,
        )
        if match:
            chunks.append(
                {
                    "file": match.group(1),
                    "size": match.group(2),
                    "unit": match.group(3),
                    "gzip_size": match.group(4),
                    "gzip_unit": match.group(5),
                }
            )
        module_match = re.search(r"(\d+) modules transformed\.", line)
        if module_match:
            build_modules = int(module_match.group(1))
        duration_match = re.search(r"built in ([0-9.]+)s", line)
        if duration_match:
            build_seconds = duration_match.group(1)
        install_match = re.search(r"added (\d+) packages, and audited (\d+) packages", line)
        if install_match:
            npm_packages_added = int(install_match.group(1))
            npm_packages_audited = int(install_match.group(2))
        vulnerability_match = re.search(r"(\d+) vulnerabilities \((\d+) moderate, (\d+) high\)", line)
        if vulnerability_match:
            npm_vulnerabilities = {
                "total": int(vulnerability_match.group(1)),
                "moderate": int(vulnerability_match.group(2)),
                "high": int(vulnerability_match.group(3)),
            }

    source_hashes: dict[str, str] = {}
    for label, relative in SOURCES.items():
        source_hashes[label] = hashlib.sha256((CAMPUSSEAT / relative).read_bytes()).hexdigest().upper()

    return {
        "run_id": run_id,
        "git_commit": commit,
        "config_hash": config_hash,
        "status": status,
        "chunks": chunks,
        "build_modules_transformed": build_modules,
        "build_seconds": build_seconds,
        "npm_packages_added": npm_packages_added,
        "npm_packages_audited": npm_packages_audited,
        "npm_vulnerabilities": npm_vulnerabilities,
        "source_hash_algorithm": "SHA-256",
        "source_hashes": source_hashes,
        "warnings": [line.strip() for line in raw_stdout.splitlines() if "warn" in line.casefold() or "(!)" in line],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--npm-cmd", required=True, help="Path to the npm command shim")
    parser.add_argument("--refresh-existing", action="store_true", help="Reparse the latest captured build log")
    args = parser.parse_args()

    config, config_hash = load_config()
    short_commit = run(["git", "rev-parse", "--short", "HEAD"], REPO)
    if short_commit.returncode:
        raise RuntimeError(short_commit.stderr.strip())
    commit = run(["git", "rev-parse", "HEAD"], REPO)
    if commit.returncode:
        raise RuntimeError(commit.stderr.strip())

    run_id = f"run_{short_commit.stdout.strip()}_{config_hash}"
    run_dir = OUTPUTS / run_id
    if args.refresh_existing:
        existing = json.loads((run_dir / "audit_summary.json").read_text(encoding="utf-8"))
        raw_stdout = (run_dir / "raw_stdout.txt").read_text(encoding="utf-8")
        summary = summarize(raw_stdout, run_id, commit.stdout.strip(), config_hash, existing["status"])
        summary_path = CITYFLOW / "docs" / "D1_AUDIT_DATA.json"
        encoded = json.dumps(summary, indent=2) + "\n"
        summary_path.write_text(encoded, encoding="utf-8")
        (run_dir / "audit_summary.json").write_text(encoded, encoding="utf-8")
        print(f"AUDIT_JSON={summary_path}")
        print(f"RUN_DIR={run_dir}")
        return 0 if summary["status"] == "success" else 1

    if run_dir.exists():
        attempt_number = len(list(run_dir.glob("attempt_*"))) + 1
        attempt_dir = run_dir / f"attempt_{attempt_number}"
        attempt_dir.mkdir()
        for name in ("library_versions.json", "raw_stdout.txt", "audit_summary.json"):
            previous = run_dir / name
            if previous.exists():
                previous.replace(attempt_dir / name)
    else:
        run_dir.mkdir(parents=True)
    if not (run_dir / "cityflow.yaml").exists():
        copyfile(CITYFLOW / "config" / "cityflow.yaml", run_dir / "cityflow.yaml")
    if not (run_dir / "seeds.json").exists():
        (run_dir / "seeds.json").write_text(
            json.dumps({"seeds": config["seeds"]}, indent=2) + "\n", encoding="utf-8"
        )

    npm_cmd = Path(args.npm_cmd).resolve()
    version_results = {
        "python": sys.version.split()[0],
        "pyyaml": yaml.__version__,
        "node": run(["node", "--version"]).stdout.strip(),
        "npm": run(["cmd.exe", "/d", "/c", "call", str(npm_cmd), "--version"]).stdout.strip(),
    }
    (run_dir / "library_versions.json").write_text(
        json.dumps(version_results, indent=2) + "\n", encoding="utf-8"
    )

    captured: list[str] = []
    status = "success"
    for arguments in (("ci",), ("run", "build")):
        result = run(["cmd.exe", "/d", "/c", "call", str(npm_cmd), *arguments], CAMPUSSEAT)
        output = result.stdout + result.stderr
        captured.append(f"> npm {' '.join(arguments)}\n{output}")
        print(output, end="")
        if result.returncode:
            status = "failed"
            break
    raw_stdout = "\n".join(captured)
    (run_dir / "raw_stdout.txt").write_text(raw_stdout, encoding="utf-8")

    summary = summarize(raw_stdout, run_id, commit.stdout.strip(), config_hash, status)
    summary_path = CITYFLOW / "docs" / "D1_AUDIT_DATA.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    (run_dir / "audit_summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    with LEDGER.open("a", newline="", encoding="utf-8") as ledger_file:
        writer = csv.writer(ledger_file)
        writer.writerow(
            [
                run_id,
                datetime.now(timezone.utc).date().isoformat(),
                commit.stdout.strip(),
                config_hash,
                "1",
                "d1_build_audit",
                "",
                "",
                "pipeline/audit_metadata.py",
                status,
                "Dashboard 1 build and source fingerprint audit",
            ]
        )

    print(f"AUDIT_JSON={summary_path}")
    print(f"RUN_DIR={run_dir}")
    return 0 if status == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
