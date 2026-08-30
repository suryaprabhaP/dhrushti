import os
import csv
import logging
from pathlib import Path

log = logging.getLogger("standalone.dataset_loader")

# Path to the standalone chatbot data folder (relative to project root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # app/engine/ -> app/ -> project root
STANDALONE_DATA_DIR = BASE_DIR / "chatbot-ui-standalone" / "data"

_cached_context = None

def load_standalone_datasets():
    """
    Recursively scans chatbot-ui-standalone/data directory for CSV files
    and compiles a compact context summary for LLM grounding.
    """
    global _cached_context
    if _cached_context is not None:
        return _cached_context

    if not STANDALONE_DATA_DIR.exists():
        log.warning(f"[DatasetLoader] Data directory not found: {STANDALONE_DATA_DIR}")
        return "No standalone datasets available."

    context_parts = []
    csv_files = list(STANDALONE_DATA_DIR.glob("*.csv")) + list(STANDALONE_DATA_DIR.glob("**/*.csv"))
    # Deduplicate files
    csv_files = list({f.resolve(): f for f in csv_files}.values())

    log.info(f"[DatasetLoader] Found {len(csv_files)} CSV files in {STANDALONE_DATA_DIR}")

    for file_path in csv_files:
        try:
            rel_name = file_path.name
            with open(file_path, mode='r', encoding='utf-8-sig', errors='replace') as f:
                reader = csv.reader(f)
                rows = list(reader)

            if not rows:
                continue

            header = rows[0]
            data_rows = rows[1:]
            num_rows = len(data_rows)

            snippet_lines = []
            snippet_lines.append(f"--- DATASET FILE: {rel_name} ({num_rows} rows) ---")
            snippet_lines.append(f"Columns: {', '.join(header[:15])}")
            
            # Pick first 5 rows as representation
            sample_rows = data_rows[:5]
            snippet_lines.append("Sample Data:")
            for r in sample_rows:
                # Truncate row items for concise prompt context
                row_str = ", ".join([str(val)[:50] for val in r[:10]])
                snippet_lines.append(f"  [{row_str}]")

            context_parts.append("\n".join(snippet_lines))

        except Exception as e:
            log.error(f"[DatasetLoader] Error parsing {file_path.name}: {e}")

    _cached_context = "\n\n".join(context_parts)
    return _cached_context

def get_dataset_context():
    return load_standalone_datasets()
