#!/usr/bin/env python3
"""Real bowling plans for Tests and T20Is, and keepers from stumpings, from the Cricsheet zips.

Usage: python3 tools/cricsheet_plans.py data/world.json tests.zip t20s.zip odis.zip
  Run after cricsheet_tests.py (and --t20). Any of the zips can be left out.

Plans: WORLD.tplans[cid][teamId] = ["map", ...], one string per innings that team bowled, in order; each character
is the bowler of that over as a letter a-k into the team's real XI (WORLD.txi / WORLD.t20xi), '.' = unknown. This is
the same alphabet as the workbook's ODI plans (WORLD.plans), so the game follows the real bowler of each over.

Keepers: Cricsheet names no keeper and no captain, but it records every stumping. A player's career stumpings for a
side (all three zips) mark him as its keeper, so a real XI whose keeper is unknown (index -1) - or an ODI XI where the
workbook fell back to the opener (index 0) and the opener has never made a stumping - gets the man in it with the most
stumpings for that side (at least two) who didn't bowl in the match.
"""
import json, sys, zipfile, collections

OUT = sys.argv[1]
ZIPS = sys.argv[2:]
LETTERS = 'abcdefghijk'


def matches(zips):
    for zp in zips:
        with zipfile.ZipFile(zp) as z:
            for fn in sorted(z.namelist()):
                if fn.endswith('.json'):
                    yield fn.rsplit('/', 1)[-1][:-5], json.loads(z.read(fn))


def main():
    world = json.load(open(OUT))
    players = world['players']
    tid_of = {t['name']: t['id'] for t in world['teams']}
    rows = {'Test': world.get('txi', {}), 'T20': world.get('t20xi', {}), 'ODI': world.get('xi', {})}
    stumps = collections.Counter()   # (name, teamId) -> career stumpings
    tplans, fixed = {}, collections.Counter()
    bowled = {}                      # cid -> {teamId: set of bowler names}
    data = list(matches(ZIPS))
    for cid, d in data:
        info = d.get('info', {})
        teams = info.get('teams', [])
        for inn in d.get('innings', []):
            bat = inn.get('team')
            field = next((t for t in teams if t != bat), None)
            for ov in inn.get('overs', []):
                for dl in ov.get('deliveries', []):
                    bowled.setdefault(cid, collections.defaultdict(set))[tid_of.get(field)].add(dl.get('bowler'))
                    for w in dl.get('wickets', []):
                        if w.get('kind') == 'stumped':
                            for f in w.get('fielders', []):
                                if not f.get('substitute') and field in tid_of:
                                    stumps[(f.get('name'), tid_of[field])] += 1
    for cid, d in data:
        info = d.get('info', {})
        mt = info.get('match_type')
        sides = rows.get(mt, {}).get(cid)
        if not sides:
            continue
        teams = info.get('teams', [])
        for tid_s, row in sides.items():
            tid = int(tid_s)
            names = [players[str(p)][0] for p in row[:11]]
            # keeper from stumpings
            opener_guess = mt == 'ODI' and row[11] == 0 and stumps[(names[0], tid)] == 0
            if row[11] < 0 or opener_guess:
                did_bowl = bowled.get(cid, {}).get(tid, set())
                cand = sorted(((stumps[(n, tid)], i) for i, n in enumerate(names) if n not in did_bowl), reverse=True)
                if cand and cand[0][0] >= 2:
                    row[11] = cand[0][1]
                    fixed[mt] += 1
            if mt == 'ODI':
                continue   # ODIs have the workbook's plans
            # plans: the bowler of each over, by innings this side bowled
            idx = {n: i for i, n in enumerate(names)}
            tname = next((t for t in teams if tid_of.get(t) == tid), None)
            maps = []
            for inn in d.get('innings', []):
                if inn.get('team') == tname or inn.get('super_over'):
                    continue
                m = []
                for ov in inn.get('overs', []):
                    while len(m) < ov.get('over', len(m)):
                        m.append('.')      # a gap in the data
                    dl = ov.get('deliveries', [])
                    i = idx.get(dl[0].get('bowler')) if dl else None
                    m.append(LETTERS[i] if i is not None else '.')
                maps.append(''.join(m))
            if maps:
                tplans.setdefault(cid, {})[tid_s] = maps
    world['tplans'] = tplans
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    overs = sum(len(m) for s in tplans.values() for ms in s.values() for m in ms)
    unk = sum(m.count('.') for s in tplans.values() for ms in s.values() for m in ms)
    print('plans for', len(tplans), 'matches,', overs, 'overs (%d unknown);' % unk, 'keepers set from stumpings:', dict(fixed))


if __name__ == '__main__':
    main()
