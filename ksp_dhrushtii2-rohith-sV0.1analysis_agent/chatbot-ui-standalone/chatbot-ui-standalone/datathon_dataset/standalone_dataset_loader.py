"""
KSP Drishti — Standalone Chatbot Dataset Loader
Reads all CSV files from chatbot-ui-standalone/data/ and builds a rich
structured context summary that is injected into the LLM system prompt.
"""
import csv
import logging
import os
from pathlib import Path
from typing import Dict, Any

log = logging.getLogger("standalone.dataset_loader")

# Path to the standalone chatbot data folder (relative to project root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # go up from app/engine/ -> app/ -> project root
STANDALONE_DATA_DIR = BASE_DIR / "chatbot-ui-standalone" / "data"


def _safe_read_csv(filepath: Path, max_rows: int = 500) -> list:
    """Safely read a CSV file, returning list of row dicts."""
    rows = []
    try:
        with open(filepath, encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= max_rows:
                    break
                rows.append({k.strip(): v.strip() for k, v in row.items() if k})
    except Exception as e:
        log.warning(f"[DatasetLoader] Could not read {filepath.name}: {e}")
    return rows


def _summarize_crime_pattern_dataset(rows: list) -> str:
    """Summarize the 2000-case crime pattern dataset."""
    if not rows:
        return ""

    crime_counts: Dict[str, int] = {}
    district_counts: Dict[str, int] = {}
    time_counts: Dict[str, int] = {}
    repeat_count = 0
    total = len(rows)

    for row in rows:
        ct = row.get("crime_type", "Unknown")
        crime_counts[ct] = crime_counts.get(ct, 0) + 1
        dist = row.get("district", "Unknown")
        district_counts[dist] = district_counts.get(dist, 0) + 1
        tp = row.get("time_pattern", "Unknown")
        time_counts[tp] = time_counts.get(tp, 0) + 1
        if row.get("offender_repeat_status", "").lower() == "repeat":
            repeat_count += 1

    top_crimes = sorted(crime_counts.items(), key=lambda x: -x[1])[:10]
    top_districts = sorted(district_counts.items(), key=lambda x: -x[1])[:10]
    top_times = sorted(time_counts.items(), key=lambda x: -x[1])[:5]

    lines = [
        f"=== KSP CRIME PATTERN DATASET ({total} cases) ===",
        "TOP CRIME TYPES: " + ", ".join(f"{k}({v})" for k, v in top_crimes),
        "TOP DISTRICTS: " + ", ".join(f"{k}({v})" for k, v in top_districts),
        "TIME PATTERNS: " + ", ".join(f"{k}({v})" for k, v in top_times),
        f"REPEAT OFFENDERS: {repeat_count}/{total} ({round(repeat_count*100/total)}%)",
    ]
    return "\n".join(lines)


def _summarize_ipc_crimes(rows: list, year: str = "2025") -> str:
    """Summarize IPC/BNS crime statistics."""
    if not rows:
        return ""
    entries = []
    for row in rows[:30]:
        vals = list(row.values())
        if len(vals) >= 3:
            head = vals[1] if vals[1] else vals[0]
            count = vals[-1]
            if count and count.isdigit():
                entries.append(f"{head.strip()[:60]}: {count}")
    if not entries:
        return ""
    return f"=== KSP IPC CRIMES {year} ===\n" + "\n".join(entries[:20])


def _summarize_district_wise(rows: list) -> str:
    """Summarize district-wise crime data."""
    if not rows:
        return ""
    lines = [f"=== KARNATAKA DISTRICT-WISE CRIME ==="]
    for row in rows[:30]:
        vals = list(row.values())
        if vals:
            lines.append(", ".join(str(v)[:40] for v in vals if v))
    return "\n".join(lines[:25])


def _summarize_cyber_crime(rows: list) -> str:
    """Summarize cyber crime data."""
    if not rows:
        return ""
    lines = ["=== CYBER CRIME DATA ==="]
    headers = list(rows[0].keys()) if rows else []
    lines.append("Columns: " + ", ".join(headers[:10]))
    for row in rows[:10]:
        lines.append(", ".join(str(v)[:30] for v in list(row.values())[:5] if v))
    return "\n".join(lines)


def _summarize_generic_csv(filepath: Path, rows: list) -> str:
    """Generic summarizer for unknown CSV schemas."""
    if not rows:
        return ""
    headers = list(rows[0].keys())
    name = filepath.stem[:40]
    lines = [f"=== DATASET: {name} ({len(rows)} rows) ===",
             "Columns: " + ", ".join(headers[:12])]
    # Count numeric columns
    for col in headers[:5]:
        vals = [r.get(col, "") for r in rows if r.get(col, "").strip()]
        if vals:
            lines.append(f"  {col}: {vals[0]} ... {vals[-1]}")
    return "\n".join(lines)


def build_dataset_context() -> str:
    """
    Main entry point: reads all CSVs from the data directory and
    returns a consolidated context string for the LLM system prompt.
    """
    if not STANDALONE_DATA_DIR.exists():
        log.warning(f"[DatasetLoader] Data directory not found: {STANDALONE_DATA_DIR}")
        return ""

    context_parts = []
    csv_files = sorted(STANDALONE_DATA_DIR.glob("*.csv"))
    log.info(f"[DatasetLoader] Loading {len(csv_files)} CSV files from {STANDALONE_DATA_DIR}")

    for csv_path in csv_files:
        rows = _safe_read_csv(csv_path)
        if not rows:
            continue

        name = csv_path.name.lower()
        summary = ""

        if "crime_pattern_dataset" in name:
            summary = _summarize_crime_pattern_dataset(rows)
        elif "ipc" in name and "2025" in name:
            summary = _summarize_ipc_crimes(rows, "2025")
        elif "ipc" in name and "2024" in name:
            summary = _summarize_ipc_crimes(rows, "2024")
        elif "district" in name:
            summary = _summarize_district_wise(rows)
        elif "cyber" in name:
            summary = _summarize_cyber_crime(rows)
        elif "women" in name or "children" in name:
            summary = _summarize_generic_csv(csv_path, rows)
        elif "sll" in name:
            summary = _summarize_generic_csv(csv_path, rows)
        elif "crime_review" in name:
            summary = _summarize_ipc_crimes(rows, "Dec-2025")
        else:
            summary = _summarize_generic_csv(csv_path, rows)

        if summary:
            context_parts.append(summary)
            log.info(f"[DatasetLoader] Loaded: {csv_path.name} ({len(rows)} rows)")

    full_context = "\n\n".join(context_parts)
    log.info(f"[DatasetLoader] Total context: {len(full_context)} chars from {len(context_parts)} datasets")
    return full_context


# Cache the context at module load time (loaded once, reused for all requests)
STANDALONE_DATASET_CONTEXT: str = ""

def get_dataset_context() -> str:
    """Returns cached dataset context, builds it on first call."""
    global STANDALONE_DATASET_CONTEXT
    if not STANDALONE_DATASET_CONTEXT:
        STANDALONE_DATASET_CONTEXT = build_dataset_context()
    return STANDALONE_DATASET_CONTEXT
