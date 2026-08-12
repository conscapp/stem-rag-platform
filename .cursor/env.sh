#!/usr/bin/env bash
# Shared configuration for conscRAG Cloud Agent environment scripts.
# Sourced by install.sh and start.sh. Keep this file side-effect free.

set -euo pipefail

# Repo root (directory that contains the .cursor folder).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_ROOT

# Durable, out-of-repo state so it survives repo re-checkouts and is captured in
# environment snapshots (Python venv, Qdrant binary + storage, model cache).
export STEM_RAG_HOME="${STEM_RAG_HOME:-$HOME/.stem-rag}"
export VENV_DIR="$STEM_RAG_HOME/venv"

# Local Qdrant server (no Docker required in the Cloud Agent VM).
export QDRANT_VERSION="${QDRANT_VERSION:-1.19.0}"
export QDRANT_DIR="$STEM_RAG_HOME/qdrant"
export QDRANT_BIN="$QDRANT_DIR/qdrant"
export QDRANT_STORAGE="$QDRANT_DIR/storage"
export QDRANT_LOG="$QDRANT_DIR/qdrant.log"
export QDRANT_PID="$QDRANT_DIR/qdrant.pid"
export QDRANT_HTTP_PORT="${QDRANT_HTTP_PORT:-6333}"
export QDRANT_GRPC_PORT="${QDRANT_GRPC_PORT:-6334}"
export QDRANT_URL="http://localhost:${QDRANT_HTTP_PORT}"

# Keep the HuggingFace model cache in durable storage.
export HF_HOME="${HF_HOME:-$STEM_RAG_HOME/hf-cache}"

# Absolute BM25 index path in durable storage. The app only honors an ABSOLUTE
# BM25_INDEX_PATH; a relative one is hardcoded to the repo's data/index, which
# would dirty the committed index on every ingest. Keeping it in $STEM_RAG_HOME
# stays consistent with the Qdrant storage and survives repo re-checkouts.
export BM25_INDEX_ABS="$STEM_RAG_HOME/bm25/bm25_corpus.json"

log() { printf '\n\033[1;36m[stem-env]\033[0m %s\n' "$*"; }

wait_for_qdrant() {
  local tries="${1:-60}"
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "${QDRANT_URL}/readyz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

qdrant_running() {
  curl -fsS "${QDRANT_URL}/readyz" >/dev/null 2>&1
}

start_qdrant() {
  mkdir -p "$QDRANT_STORAGE" "$QDRANT_DIR"
  if qdrant_running; then
    log "Qdrant already running at ${QDRANT_URL}"
    return 0
  fi
  # Clean up a stale pid file if the process is gone.
  if [[ -f "$QDRANT_PID" ]] && ! kill -0 "$(cat "$QDRANT_PID")" 2>/dev/null; then
    rm -f "$QDRANT_PID"
  fi
  log "Starting Qdrant (storage: $QDRANT_STORAGE)"
  QDRANT__SERVICE__HTTP_PORT="$QDRANT_HTTP_PORT" \
  QDRANT__SERVICE__GRPC_PORT="$QDRANT_GRPC_PORT" \
  QDRANT__STORAGE__STORAGE_PATH="$QDRANT_STORAGE" \
  QDRANT__TELEMETRY_DISABLED="true" \
    nohup "$QDRANT_BIN" >>"$QDRANT_LOG" 2>&1 &
  echo $! >"$QDRANT_PID"
  if wait_for_qdrant 60; then
    log "Qdrant is ready at ${QDRANT_URL}"
  else
    log "ERROR: Qdrant did not become ready; see $QDRANT_LOG"
    tail -n 40 "$QDRANT_LOG" || true
    return 1
  fi
}
