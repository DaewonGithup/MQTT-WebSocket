#!/bin/bash
# Cloud sessions only: install the Headroom CLI and the three plugins
# (Headroom, Ponytail, Effortless) so they survive container resets.
set -u
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

export PATH="$HOME/.local/bin:$PATH"

if ! command -v headroom >/dev/null 2>&1; then
  command -v uv >/dev/null 2>&1 || pip install -q uv >&2
  uv tool install headroom-ai >&2 || echo "headroom-ai install failed" >&2
fi

installed=$(claude plugin list 2>/dev/null)
for pair in \
  "headroomlabs-ai/headroom headroom@headroom-marketplace" \
  "DietrichGebert/ponytail ponytail@ponytail" \
  "HeyCubit/effortless effortless@effortless"
do
  set -- $pair
  if ! printf '%s' "$installed" | grep -q "$2"; then
    claude plugin marketplace add "$1" >&2 || true
    claude plugin install "$2" >&2 || true
  fi
done
exit 0
