#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  echo '[ERROR] Install Node.js 22.12+ and pnpm first.' >&2
  exit 1
fi
exec node scripts/run.mjs build "$@"
