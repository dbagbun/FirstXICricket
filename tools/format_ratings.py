#!/usr/bin/env python3
"""Test and T20I ratings and batting colours, by era, from the real scorecards.

Usage: python3 tools/format_ratings.py data/world.json data/hist.json.gz
  Run after tools/cricsheet_cards.py. ODIs keep the workbook's own ratings (players[pid][7]); this adds
  WORLD.fx[pid] = {"T": [[year, rating, colour], ...], "Tc": [rating, colour], "I": [...], "Ic": [...]}
  for Tests (T) and T20Is (I): the era table (only the years it changes) and the whole-career values.
  rating 0 = no bowling record in that format, colour '' = no batting record: the game falls back to the ODI values.

Bowling, like the workbook's ODI era ratings: each year's rating comes from the ERA_YEARS before it (his career to
date if that's too little, his first spells if there's nothing yet). The cut-offs are set so that, weighted by the
overs actually bowled, the ratings share out as they do in real ODI bowling plans (OVERS_SHARE: 15% of overs by
rating-1 bowlers ... ) - so a Test or T20I is as well bowled, overall, as the game's balance expects, and only who is
good changes. Light bowlers can't rate better than 4 (or 5). Tests: a steadied bowling average (wickets win Tests); T20Is: runs
an over less a wicket bonus (economy rules), as the ODI ratings are judged.
Batting: average in Tests (BLUE from 33, GREEN from 17); in T20Is average x strike rate / 100, cut so the colours
share out among top-order batters as they do in ODIs. Two letters ('BG') when he's weaker against Test nations.
"""
import collections, gzip, json, sys

ERA_YEARS = 3
FMTS = {
    # key, minimum balls in a window to join the rating pool, balls below which he rates no better than 4 / 5
    'TEST': dict(key='T', pool=1500, cap4=1500, cap5=600, first=1500, min_inn=8, min_full=6, bat_cut=(33, 17)),
    'T20': dict(key='I', pool=360, cap4=240, cap5=120, first=240, min_inn=8, min_full=6, bat_cut=(26, 13)),
}
RANK = {'B': 0, 'G': 1, 'R': 2}
OVERS_SHARE = [.15, .24, .26, .20]   # ratings 1-4 (5 = the rest), as in the workbook's ODI plans


def bowl_value(fmt, balls, runs, wkts):
    if fmt == 'TEST':
        return (runs + 34.0 * 4) / (wkts + 4)        # an average steadied by four wickets at 34
    return runs / (balls / 6) - 9.0 * wkts / (balls / 6)




def bat_value(fmt, inns):
    runs = sum(i[1] for i in inns); outs = sum(1 for i in inns if i[3]); balls = sum(i[2] for i in inns)
    avg = runs / max(1, outs)
    return avg if fmt == 'TEST' else avg * (runs / max(1, balls))   # T20: average x strike rate / 100


def colour(fmt, inns):
    v = bat_value(fmt, inns); b, g = FMTS[fmt]['bat_cut']
    return 'B' if v >= b else 'G' if v >= g else 'R'


def main():
    world = json.load(open(sys.argv[1]))
    hist = json.loads(gzip.decompress(open(sys.argv[2], 'rb').read()))
    full = {t['id'] for t in world['teams'] if t.get('full')}
    meta = {}
    for r in world.get('tests', []):
        meta[r[7]] = ('TEST', int(r[1][:4]))
    for r in world.get('t20s', []):
        meta[r[7]] = ('T20', int(r[1][:4]))
    rows = {'TEST': world.get('txi', {}), 'T20': world.get('t20xi', {})}
    bat = {f: collections.defaultdict(list) for f in FMTS}    # pid -> [(year, runs, balls, out, vsFull)]
    bowl = {f: collections.defaultdict(list) for f in FMTS}   # pid -> [(year, balls, runs, wkts, vsFull)]
    for cid, H in hist.items():
        if cid not in meta:
            continue
        fmt, year = meta[cid]
        R = rows[fmt].get(cid)
        if not R:
            continue
        teams = [int(t) for t in R]
        for I in H['i']:
            bt, bw = I[0], next(t for t in teams if t != I[0])
            prow, frow = R[str(bt)], R[str(bw)]
            for b in I[6]:
                if b[0] >= 0:
                    bat[fmt][prow[b[0]]].append((year, b[1], b[2], b[5] != '', bw in full))
            for w in I[7]:
                if w[0] >= 0 and w[1] > 0:
                    bowl[fmt][frow[w[0]]].append((year, w[1], w[3], w[4], bt in full))
    fx = collections.defaultdict(dict)
    for fmt, C in FMTS.items():
        k = C['key']
        years = sorted({y for recs in bat[fmt].values() for y, *_ in recs})

        def window(recs, y, need):
            w = [x for x in recs if y - ERA_YEARS <= x[0] < y]
            if sum(x[1] for x in w) >= need:
                return w
            w = [x for x in recs if x[0] < y]
            if sum(x[1] for x in w) >= need:
                return w
            out, n = [], 0                     # nothing yet: judge him on his first spells
            for x in sorted(recs):
                out.append(x); n += x[1]
                if n >= C['first']:
                    break
            return out

        def tot(w):
            return sum(x[1] for x in w), sum(x[2] for x in w), sum(x[3] for x in w)

        # every year a man bowled: the value he'd be rated on, weighted by the balls he bowled that year
        wv = []
        for recs in bowl[fmt].values():
            for y in sorted({x[0] for x in recs}):
                b = sum(x[1] for x in recs if x[0] == y)
                w = window(recs, y, C['pool'])
                if tot(w)[0] >= 30:
                    wv.append((bowl_value(fmt, *tot(w)), b))
        wv.sort()
        allb, cum, cuts, i = sum(b for _, b in wv), 0, [], 0
        for target in [sum(OVERS_SHARE[:k + 1]) for k in range(len(OVERS_SHARE))]:
            while i < len(wv) and cum + wv[i][1] <= target * allb:
                cum += wv[i][1]; i += 1
            cuts.append(wv[min(i, len(wv) - 1)][0])

        def rate(w):
            balls, runs, wkts = tot(w)
            if balls < 30:
                return 0
            v = bowl_value(fmt, balls, runs, wkts)
            r = next((k + 1 for k, c in enumerate(cuts) if v < c), 5)
            if balls < C['cap4']:
                r = max(r, 5 if balls < C['cap5'] else 4)
            return r

        def bat_colour(inns):
            if len(inns) < C['min_inn']:
                return ''
            c = colour(fmt, inns)
            f = [i for i in inns if i[4]]
            if len(f) >= C['min_full']:
                cf = colour(fmt, f)
                if RANK[cf] > RANK[c]:
                    return c + cf
            return c

        tally = collections.Counter()
        for pid in set(bat[fmt]) | set(bowl[fmt]):
            B, W = bat[fmt].get(pid, []), bowl[fmt].get(pid, [])
            ys = sorted({x[0] for x in B} | {x[0] for x in W})
            era, last = [], None
            for y in range(ys[0], ys[-1] + 1):
                r = rate(window(W, y, C['pool'])) if W else 0
                wb = [x for x in B if y - ERA_YEARS <= x[0] < y]
                if len(wb) < C['min_inn']:
                    wb = [x for x in B if x[0] < y]
                c = bat_colour(wb) if len(wb) >= C['min_inn'] else bat_colour(sorted(B)[:C['min_inn'] * 2])
                if (r, c) != last:
                    era.append([y, r, c]); last = (r, c)
            fx[str(pid)][k] = era
            fx[str(pid)][k + 'c'] = [rate(W) if W else 0, bat_colour(B)]
            tally[fx[str(pid)][k + 'c'][0]] += 1
        print(fmt, 'players', len(fx), 'career bowling ratings', dict(sorted(tally.items())), 'cut-offs', [round(c, 2) for c in cuts])
    world['fx'] = fx
    json.dump(world, open(sys.argv[1], 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
