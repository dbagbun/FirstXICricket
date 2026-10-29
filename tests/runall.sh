#!/usr/bin/env bash
# Build, run the static checks and every e2e test. A failing test is rerun once (fresh seed) and only
# counts if it fails twice. Prints failures, then "REGRESSION DONE: N failing"; exits non-zero on failure.
cd "$(dirname "$0")/.." || exit 1
node tools/build.js >/dev/null || exit 1
node tools/check.js || exit 1
fails=0
for t in tests/e2e*.js; do
  if ! FXI_SEED=${FXI_SEED:-1} node -r ./tests/seed.js "$t" dist/first-xi.html >/tmp/fxi-test.log 2>&1; then
    if ! FXI_SEED=$(( ${FXI_SEED:-1} + 100 )) node -r ./tests/seed.js "$t" dist/first-xi.html >/tmp/fxi-test.log 2>&1; then
      echo "FAILED $t"; cat /tmp/fxi-test.log; fails=$((fails+1))
    fi
  fi
done
node tests/engine-stats.js 200 60
echo "REGRESSION DONE: $fails failing"
exit $fails
