#!/usr/bin/env bash
# Per-boot startup: bring up the local Qdrant server and verify it is ready.
# The backend and frontend dev servers run as visible tmux terminals (see
# environment.json "terminals"), so this script only owns the Qdrant daemon.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/env.sh"

if [[ ! -x "$QDRANT_BIN" ]]; then
  log "ERROR: Qdrant binary missing at $QDRANT_BIN. Run .cursor/install.sh first."
  exit 1
fi

start_qdrant

# Self-heal: if the collection is empty (e.g. storage was not persisted), the
# retrieval demo would return nothing, so re-ingest from the bundled data.
if [[ -x "$VENV_DIR/bin/python" && -f "$REPO_ROOT/backend/.env" ]]; then
  collection="$(grep -E '^COLLECTION_NAME=' "$REPO_ROOT/backend/.env" | cut -d= -f2)"
  collection="${collection:-stem_vectors}"
  points="$(curl -fsS "${QDRANT_URL}/collections/${collection}" 2>/dev/null \
    | python3 -c 'import sys,json;
try:
    d=json.load(sys.stdin); print(d.get("result",{}).get("points_count") or 0)
except Exception:
    print(0)' 2>/dev/null || echo 0)"
  if [[ "${points:-0}" -le 0 ]]; then
    log "Qdrant collection '${collection}' is empty — re-ingesting bundled knowledge"
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    ( cd "$REPO_ROOT/backend" && python scripts/ingest_premium.py --fresh ) || \
      log "WARNING: ingest failed; retrieval may be empty until it succeeds"
  elif [[ ! -f "$BM25_INDEX_ABS" ]]; then
    log "Qdrant ready (${points} points) but BM25 index missing — rebuilding from Qdrant"
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    ( cd "$REPO_ROOT/backend" && python scripts/ingest_premium.py --rebuild-bm25 ) || \
      log "WARNING: BM25 rebuild failed; hybrid search may degrade"
  else
    log "Qdrant collection '${collection}' ready (${points} points)"
  fi
fi

log "Startup complete."
