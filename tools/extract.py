#!/usr/bin/env python3
"""Extract the game world from the First XI Excel workbook into data/world.json.

Usage: python3 tools/extract.py path/to/FirstXI.xlsm [data/world.json]

Reads Teams, Players, Fixtures, MatchXI, BowlingXI and the RR_* run-rate cards.
Bowler ratings: a rating set by hand in the Players sheet (matched by name) wins;
everyone else gets a rating derived from their real Cricsheet spells in BowlingXI.
"""
import json, re, sys, collections
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else 'FirstXI.xlsm'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/world.json'

FULL = {1, 3, 4, 5, 6, 7, 8, 9, 10, 11}  # Test nations in the workbook (Zimbabwe and Bangladesh included)
SHORT = {
    'Australia': 'AUS', 'India': 'IND', 'England': 'ENG', 'South Africa': 'RSA', 'Pakistan': 'PAK',
    'Sri Lanka': 'SL', 'West Indies': 'WI', 'New Zealand': 'NZ', 'Zimbabwe': 'ZIM', 'Bangladesh': 'BAN',
    'Kenya': 'KEN', 'Ireland': 'IRE', 'Netherlands': 'NED', 'Scotland': 'SCO', 'Canada': 'CAN',
    'United Arab Emirates': 'UAE', 'Namibia': 'NAM', 'United States of America': 'USA', 'Nepal': 'NEP',
    'Oman': 'OMA', 'Papua New Guinea': 'PNG', 'Hong Kong': 'HK', 'Bermuda': 'BER', 'Jersey': 'JER',
    'Africa XI': 'AFR', 'Asia XI': 'ASIA', 'ICC World XI': 'WXI',
}
RR_CODES = ['3', '4A', '4B', '5', '6', '7']


def rows(ws, start=2):
    return [r for r in ws.iter_rows(min_row=start, values_only=True) if any(c is not None for c in r)]


def num(v):
    try:
        return int(float(str(v).strip()))
    except (TypeError, ValueError):
        return 0


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)

    # ---- teams ----
    teams = []
    for r in rows(wb['Teams']):
        tid, name = num(r[0]), str(r[1]).strip()
        if tid:
            teams.append({'id': tid, 'name': name, 'short': SHORT.get(name, (r[2] or name[:3]).upper()),
                          'full': tid in FULL})
    name2tid = {t['name']: t['id'] for t in teams}

    # ---- run-rate cards ----
    cards = {}
    for code in RR_CODES:
        grid = []
        for r in rows(wb['RR_' + code]):
            if num(r[0]) < 1:
                continue
            toks = []
            for c in r[1:7]:
                t = '0' if c in (None, '', '.') else str(c).strip().upper().replace(' ', '_')
                toks.append(t)
            grid.append(toks)
        assert len(grid) == 100, (code, len(grid))
        cards[code] = grid

    # ---- fixtures ----
    fixtures = []
    for r in rows(wb['Fixtures']):
        d = str(r[1]).replace('/', '-')
        fixtures.append([num(r[0]), d, (r[2] or '').strip(), num(r[3]), num(r[5]),
                         (r[7] or '').strip(), (r[8] or '').strip(), str(r[11] or '').strip()])

    # ---- XIs ----
    xi_rows = collections.defaultdict(list)
    names = {}
    for r in rows(wb['MatchXI']):
        cid, team, pos, pid, pname, wk, cap = str(r[0]).strip(), r[1], num(r[2]), num(r[3]), r[4], r[5], r[6]
        names[pid] = pname
        xi_rows[(cid, name2tid[team])].append((pos, pid, wk == 'Y', cap == 'Y'))
    xi = collections.defaultdict(dict)
    for (cid, tid), lst in xi_rows.items():
        lst.sort()
        flagged_wk = [p for _, p, w, _ in lst if w]
        flagged_cap = [p for _, p, _, c in lst if c]
        eleven = [p for _, p, _, _ in lst][:11]
        wk = next((p for p in flagged_wk if p in eleven), eleven[0])
        cap = next((p for p in flagged_cap if p in eleven), eleven[0])
        xi[cid][tid] = eleven + [eleven.index(wk), eleven.index(cap)]

    # ---- bowling plans + real figures ----
    team_of = {}
    for cid, sides in xi.items():
        for tid, lst in sides.items():
            for p in lst[:11]:
                team_of[(cid, p)] = tid
    plans = collections.defaultdict(dict)
    stats = collections.defaultdict(lambda: {'full': [0, 0, 0, 0], 'all': [0, 0, 0, 0], 'ov': collections.Counter(), 'mt': 0})
    for r in rows(wb['BowlingXI']):
        cid, inn, pid = str(r[0]).strip(), num(r[1]), num(r[3])
        if inn > 2 or cid not in xi:
            continue
        tid = team_of.get((cid, pid))
        if not tid:
            continue
        opp = next((t for t in xi[cid] if t != tid), None)
        overs = [num(x) for x in str(r[15] or '').split(',') if str(x).strip() != '']
        p = plans[cid].setdefault(tid, {'map': ['.'] * 50, 'fig': []})
        idx = xi[cid][tid][:11].index(pid)
        for o in overs:
            if 0 <= o < 50:
                p['map'][o] = 'abcdefghijk'[idx]
        balls = len(overs) * 6
        runs, wk = num(r[7]), num(r[8])
        p['fig'].append([pid, len(overs), num(r[6]), runs, wk])
        s = stats[pid]
        for key in (['all', 'full'] if opp in FULL else ['all']):
            s[key][0] += balls; s[key][1] += runs; s[key][2] += wk; s[key][3] += 1
        s['ov'].update(overs)
        s['mt'] += 1
    for cid in plans:
        for tid in plans[cid]:
            plans[cid][tid]['map'] = ''.join(plans[cid][tid]['map']).rstrip('.')

    # ---- bowler attributes ----
    hand = {}
    for r in rows(wb['Players']):
        if r[1]:
            hand[str(r[1]).strip()] = (str(r[8] or 'NONE').strip().upper(), num(r[9]), num(r[10]))

    def value(b):  # lower is better: runs per over minus wicket bonus
        balls, runs, wk, _ = b
        return runs / (balls / 6) - 9.0 * wk / (balls / 6)

    pool = sorted(value(s['full']) for s in stats.values() if s['full'][0] >= 360)
    def pct(v):
        lo = sum(1 for x in pool if x < v)
        return lo / max(1, len(pool))

    players = {}
    for pid, pname in names.items():
        s = stats.get(pid)
        style, rating, mx, src = 'N', 7, 0, 'd'
        if s and s['all'][0] >= 30:
            use, penal = (s['full'], 0) if s['full'][0] >= 180 else (s['all'], 1)
            pc = pct(value(use))
            rating = 1 if pc < .10 else 2 if pc < .30 else 3 if pc < .60 else 4 if pc < .85 else 5
            rating = min(5, rating + penal)
            if s['all'][0] < 240:
                rating = max(rating, 5 if s['all'][0] < 120 else 4)
            ov = s['ov']; tot = sum(ov.values())
            new = sum(v for o, v in ov.items() if o < 10) / tot
            edge = sum(v for o, v in ov.items() if o < 6 or o >= 44) / tot
            style = 'S' if (edge < .14 and tot >= 20) else 'P' if new >= .30 else 'M'
            avg = s['all'][0] / 6 / max(1, s['mt'])
            mx = 10 if avg >= 6.5 else max(2, min(10, round(avg * 1.4)))
        h = hand.get(pname)
        if h:
            hs, hr, hm = h
            if hs == 'NONE' or hm == 0:
                style, rating, mx = 'N', 7, 0
            else:
                style, rating, mx = hs[0], hr or 3, hm or 10
            src = 'h'
        players[pid] = [pname, style, rating, mx, src]

    world = {
        'source': SRC.split('/')[-1],
        'teams': teams,
        'cards': cards,
        'fixtures': fixtures,
        'xi': xi,
        'plans': plans,
        'players': players,
    }
    with open(OUT, 'w') as f:
        json.dump(world, f, separators=(',', ':'))
    print('wrote', OUT, 'fixtures', len(fixtures), 'xis', len(xi), 'plans', len(plans), 'players', len(players),
          'hand-rated', sum(1 for p in players.values() if p[4] == 'h'))
    print('ratings', collections.Counter(p[2] for p in players.values()), 'styles', collections.Counter(p[1] for p in players.values()))


if __name__ == '__main__':
    main()
