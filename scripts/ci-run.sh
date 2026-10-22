#!/usr/bin/env bash
# Runs a command; on failure, publishes the tail of its output as a GitHub annotation
# (readable from the run page and the API without downloading full logs).
set -uo pipefail
LOG="$(mktemp)"
"$@" 2>&1 | tee "$LOG"
code=${PIPESTATUS[0]}
if [ "$code" -ne 0 ]; then
  { grep -E '^e: |What went wrong|^> |error:|Error:|FAILED|Could not|not found|Unresolved' "$LOG" | grep -v '^> Task' | head -n 30; echo '-----'; grep -v '^\s*$' "$LOG" | grep -v '^w: ' | tail -n 40; } > "$LOG.sum"
  msg=$(sed 's/%/%25/g' "$LOG.sum" | cut -c1-300 | awk '{printf "%s%%0A", $0}')
  echo "::error title=Failed: $1::${msg}"
fi
exit "$code"
