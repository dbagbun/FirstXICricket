#!/bin/bash
# fetch raw wikitext (action=raw) for missing pages, wrap as parse-API JSON
while IFS=$'\t' read -r f t; do
  [ -s "$f" ] && continue
  for try in 1 2 3 4; do
    code=$(curl -sS -m 40 -A "FirstXI-offline-game-data/1.0 (personal project)" -o raw.tmp -w "%{http_code}" "https://en.wikipedia.org/w/index.php?title=$t&action=raw")
    if [ "$code" = 200 ] && [ -s raw.tmp ]; then
      python3 -I -c 'import json,sys;print(json.dumps({"parse":{"wikitext":{"*":open(sys.argv[1],encoding="utf-8").read()}}}))' raw.tmp > "$f"
      echo "$f ok"; sleep 5; break
    fi
    echo "$f $code"; sleep $((try*30))
  done
done < "$1"
echo done
