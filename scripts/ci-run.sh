#!/usr/bin/env bash
# Runs a command; on failure, publishes the tail of its output as a GitHub annotation
# (readable from the run page and the API without downloading full logs).
set -uo pipefail
LOG="$(mktemp)"
"$@" 2>&1 | tee "$LOG"
code=${PIPESTATUS[0]}
if [ "$code" -ne 0 ]; then
  msg=$(grep -v '^\s*$' "$LOG" | tail -n 80 | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')
  echo "::error title=Failed: $1::${msg}"
fi
exit "$code"
