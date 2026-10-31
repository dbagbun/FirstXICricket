#!/usr/bin/env python3
"""Batting colours from real averages, from Cricsheet's ODI (and optionally Test) ball-by-ball zips.

Usage: python3 tools/cricsheet_batting.py odis_json.zip [tests_json.zip] [data/world.json]

Every innings by a player in one of world.json's XIs (ODIs: WORLD.xi, Tests: WORLD.txi, matched by name) counts.
His colour for year Y comes from his average over the ERA_YEARS before Y (his whole career to date if that's fewer
than MIN_INN innings): BLUE from 30 (Tests 33), GREEN from 15 (Tests 17), RED below - ODIs first, Tests if the ODIs
are too few. Against Test nations alone (MIN_VS_FULL innings) a weaker colour makes it two letters ('BG' = BLUE v
associates, GREEN v Test nations). The career colour (players[pid][5]) uses every innings. Colours set by hand in
the workbook (batSrc 'h') are left alone; the rest get batSrc 'c' (no position lift in the game).
"""
import collections, json, sys, zipfile

ERA_YEARS, MIN_INN, MIN_VS_FULL, MIN_CAREER = 3, 8, 6, 12
CUT = {'ODI': (30, 15), 'TEST': (33, 17)}
RANK = {'B': 0, 'G': 1, 'R': 2}
NOT_OUT_KINDS = {'retired hurt', 'retired not out'}


def colour(inns, fmt):
    runs = sum(i[1] for i in inns); outs = sum(1 for i in inns if i[2])
    avg = runs / max(1, outs)
    b, g = CUT[fmt]
    return 'B' if avg >= b else 'G' if avg >= g else 'R'


def main():
    args = sys.argv[1:]
    out = args.pop() if args and args[-1].endswith('.json') else 'data/world.json'
    zips = args
    world = json.load(open(out))
    players, full = world['players'], {t['id'] for t in world['teams'] if t.get('full')}
    tid_of = {t['name']: t['id'] for t in world['teams']}
    xis = {'ODI': world.get('xi', {}), 'TEST': world.get('txi', {})}
    rec = collections.defaultdict(list)            # pid -> [(year, runs, out, vsFull, fmt)]
    for path in zips:
        with zipfile.ZipFile(path) as z:
            for n in z.namelist():
                if not n.endswith('.json'):
                    continue
                cid = n.rsplit('/', 1)[-1][:-5]
                fmt = 'ODI' if cid in xis['ODI'] else 'TEST' if cid in xis['TEST'] else None
                if not fmt:
                    continue
                d = json.loads(z.read(n)); info = d.get('info', {})
                year = int(str((info.get('dates') or ['2000'])[0])[:4])
                names = {}
                for tid, lst in xis[fmt][cid].items():
                    for pid in lst[:11]:
                        if str(pid) in players:
                            names[players[str(pid)][0]] = (int(pid), int(tid))
                for inn in d.get('innings', []):
                    bat_team = tid_of.get(inn.get('team'), 0)
                    opp = next((t for t in {v[1] for v in names.values()} if t != bat_team), 0)
                    sc, outs = collections.Counter(), set()
                    batted = []
                    for ov in inn.get('overs', []):
                        for dl in ov.get('deliveries', []):
                            for who in (dl['batter'], dl['non_striker']):
                                if who not in batted:
                                    batted.append(who)
                            sc[dl['batter']] += dl['runs']['batter']
                            for x in dl.get('wickets', []):
                                if x.get('kind') not in NOT_OUT_KINDS:
                                    outs.add(x.get('player_out'))
                    for who in batted:
                        if who in names:
                            rec[names[who][0]].append((year, sc[who], who in outs, opp in full, fmt))
    changed = dist = 0
    tally = collections.Counter()
    for pid, R in rec.items():
        p = players.get(str(pid))
        if not p:
            continue
        while len(p) < 8:   # players added by cricsheet_tests.py have no era table yet
            p.append([None, 'N', 7, 0, 'd', '', 'd', []][len(p)])
        if p[6] == 'h':
            continue
        def pick(window):
            for fmt in ('ODI', 'TEST'):
                w = [i for i in window if i[4] == fmt]
                if len(w) >= MIN_INN:
                    c = colour(w, fmt)
                    wf = [i for i in w if i[3]]
                    if len(wf) >= MIN_VS_FULL:
                        cf = colour(wf, fmt)
                        if RANK[cf] > RANK[c]:
                            return c + cf
                    return c
            return None
        era = p[7] or []
        years = sorted({y for y, *_ in R})
        lo = min([e[0] for e in era] + years); hi = max([e[0] for e in era] + years)
        def base(y):
            e = None
            for x in era:
                if x[0] <= y:
                    e = x
            return e or (era[0] if era else [y, p[2], p[5]])
        new, last = [], None
        for y in range(lo, hi + 1):
            b = base(y)
            win = [i for i in R if y - ERA_YEARS <= i[0] < y]
            c = pick(win if len([i for i in win if i[4] == 'ODI']) >= MIN_INN or len(win) >= MIN_INN else [i for i in R if i[0] < y])
            ent = (b[1], c if c else b[2])
            if ent != last:
                new.append([y, ent[0], ent[1]]); last = ent
        career = pick(R) if len(R) >= MIN_CAREER else None
        if new != era or (career and career != p[5]):
            changed += 1
        p[7] = new
        if career:
            p[5], p[6] = career, 'c'; tally[career] += 1
        elif any(e[2] != b[2] for e, b in zip(new, [base(e[0]) for e in new])):
            p[6] = 'c'
    json.dump(world, open(out, 'w'), separators=(',', ':'))
    print('batting from', sum(len(r) for r in rec.values()), 'innings by', len(rec), 'players;', changed, 'updated; career colours', dict(tally))


if __name__ == '__main__':
    main()
