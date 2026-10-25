"""Check CityFlow source and documentation against the claims policy."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLAIMS_PATH = ROOT / "docs" / "CLAIMS.md"
TEXT_SUFFIXES = {".css", ".html", ".js", ".jsx", ".json", ".md", ".py", ".ts", ".tsx", ".yaml", ".yml"}


def banned_words() -> list[str]:
    words: list[str] = []
    in_section = False
    for line in CLAIMS_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip().casefold() == "## banned words":
            in_section = True
            continue
        if in_section and line.startswith("## "):
            break
        if in_section and line.lstrip().startswith("-"):
            word = line.lstrip()[1:].strip().strip("`").strip()
            if word:
                words.append(word)
    if not words:
        raise ValueError(f"No banned-word list found in {CLAIMS_PATH}")
    return words


def main() -> int:
    terms = banned_words()
    findings: list[tuple[str, int, str]] = []
    roots = (ROOT / "src", ROOT / "docs")
    for scan_root in roots:
        if not scan_root.is_dir():
            continue
        for path in sorted(scan_root.rglob("*")):
            if not path.is_file() or path.suffix.casefold() not in TEXT_SUFFIXES:
                continue
            if path.resolve() == CLAIMS_PATH.resolve():
                continue  # The policy must contain the terms it defines.
            content = path.read_text(encoding="utf-8", errors="replace")
            for line_number, line in enumerate(content.splitlines(), start=1):
                lowered = line.casefold()
                for term in terms:
                    if re.search(re.escape(term.casefold()), lowered):
                        findings.append((path.relative_to(ROOT).as_posix(), line_number, term))

    if findings:
        for relative, line_number, term in findings:
            print(f"{relative}:{line_number}: banned wording found: {term}")
        return 1
    print("Claims audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
