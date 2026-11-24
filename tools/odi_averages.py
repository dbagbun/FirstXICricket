#!/usr/bin/env python3
"""Real ODI batting averages by era, from the real scorecards, for the engine's colour blend (03-engine odiLevel).

Usage: python3 tools/odi_averages.py [data/world.json] [data/hist.json.gz]
  Run after tools/cricsheet_cards.py (and before extra_odis.py, though it ignores the added ODIs either way).
  WORLD.oavg[pid] = [[year, average], ...]: from that year on (until the next entry), his average over the ODIs in
  the ERA_YEARS before it - the same window as his batting colour (cricsheet_batting.py) - or over his whole career
  so far when that window has fewer than MIN_INN innings; none until he has MIN_CAREER. Averages are whole runs; an
  entry is written only when the value changes.
"""
import gzip, json, sys
from collections import defaultdict

OUT = sys.argv[1] if len(sys.argv) > 1 else 'data/world.json'
HIST = sys.argv[2] if len(sys.argv) > 2 else 'data/hist.json.gz'
ERA_YEARS, MIN_INN, MIN_CAREER = 3, 8, 10


def avg(rows):
    outs = sum(1 for r in rows if r[2])
    return sum(r[1] for r in rows) / max(1, outs)


def main():
    world = json.load(open(OUT))
    hist = json.load(gzip.open(HIST))
    extra = set(world.get('extra', []))
    rec = defaultdict(list)   # pid -> [(year, runs, out)]
    for f in world['fixtures']:
        if f[0] in extra or f[7] not in hist:
            continue
        year = int(f[1][:4])
        for I in hist[f[7]]['i']:
            x = world['xi'].get(f[7], {}).get(str(I[0]))
            if not x:
                continue
            for b in I[6]:
                if 0 <= b[0] < 11:
                    rec[x[b[0]]].append((year, b[1], bool(b[5])))
    oavg = {}
    for pid, R in sorted(rec.items()):
        years = sorted({r[0] for r in R})
        out, last = [], None
        for y in range(years[0] + 1, years[-1] + 2):
            before = [r for r in R if r[0] < y]
            if len(before) < MIN_CAREER:
                continue
            win = [r for r in before if r[0] >= y - ERA_YEARS]
            v = round(avg(win if len(win) >= MIN_INN else before))
            if v != last:
                out.append([y, v]); last = v
        if out:
            oavg[str(pid)] = out
    world['oavg'] = oavg
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    print('ODI era averages for', len(oavg), 'players,', sum(len(v) for v in oavg.values()), 'entries')


main()
