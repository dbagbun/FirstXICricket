#!/usr/bin/env python3
"""Real-result summaries for the real Tests and T20Is (the ODIs' come from cricsheet_odis.py), from the scorecards.

Usage: python3 tools/real_summary.py data/world.json data/hist.json.gz
  Run after tools/cricsheet_cards.py. Adds WORLD.real[cid] for every real Test and T20I, in the ODI shape:
  {r: [winner, type, margin, dl], inn: [[team, runs, wkts, legalBalls, declared]], pom, top: [pid, runs, balls],
   bb: [pid, wkts, runs], so: superOverWinner}  - type also 'inns' and 'draw' for Tests.
  The game shows it after you play that match ("What really happened") and counts it in your timeline v history.
"""
import gzip, json, sys


def main():
    world = json.load(open(sys.argv[1]))
    hist = json.loads(gzip.decompress(open(sys.argv[2], 'rb').read()))
    rows = {}
    for key in ('txi', 't20xi'):
        rows.update(world.get(key, {}))
    real = world.setdefault('real', {})
    n = 0
    for cid, H in hist.items():
        R = rows.get(cid)
        if not R or cid in real:   # ODIs already have theirs
            continue
        teams = [int(t) for t in R]
        top, bb = [0, -1, 0], [0, -1, 999]
        inn = []
        for I in H['i']:
            bat = I[0]
            bowl = next(t for t in teams if t != bat)
            inn.append([bat, I[1], I[2], I[3], 1 if I[4] == 'declared' else 0])
            for b in I[6]:
                if b[0] >= 0 and (b[1] > top[1] or b[1] == top[1] and b[2] < top[2]):
                    top = [R[str(bat)][b[0]], b[1], b[2]]
            for w in I[7]:
                if w[0] >= 0 and (w[4] > bb[1] or w[4] == bb[1] and w[3] < bb[2]):
                    bb = [R[str(bowl)][w[0]], w[4], w[3]]
        w, t, m, method = H['r']
        out = {'r': [w, t, m, 1 if method else 0], 'inn': inn, 'pom': H.get('pom', 0),
               'top': top if top[0] else [0, 0, 0], 'bb': bb if bb[0] else [0, 0, 0]}
        if H.get('so'):
            out['so'] = H['so']
        real[cid] = out
        n += 1
    json.dump(world, open(sys.argv[1], 'w'), separators=(',', ':'))
    print('real summaries added for', n, 'Tests and T20Is; total', len(real))


if __name__ == '__main__':
    main()
