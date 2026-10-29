#!/usr/bin/env python3
"""Add the real Test calendar from Cricsheet to data/world.json.

Usage: python3 tools/cricsheet_tests.py tests_json.zip [data/world.json]
  (tests_json.zip from https://cricsheet.org/downloads/ - the JSON format)

For every Test between two teams in the workbook's Teams list, from the first ODI fixture date onwards:
  WORLD.tests  = [[no, date, event, teamA, teamB, venue, city, cricsheetId], ...]
  WORLD.txi    = {cricsheetId: {teamId: [11 player ids in batting order, wkIndex, capIndex]}}
Players are matched to existing ids by (name, team) and then by name; new players get new ids.
Players with no ODI bowling rating are rated from their Test bowling (economy and strike rate).
Run it again whenever Cricsheet publishes more Tests; it replaces WORLD.tests/txi each time.
"""
import json, sys, zipfile, collections

ZIP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/world.json'


def main():
    world = json.load(open(OUT))
    tid_of = {t['name']: t['id'] for t in world['teams']}
    start = min(f[1] for f in world['fixtures'])
    players = world['players']
    by_name_team, by_name = {}, collections.defaultdict(list)
    # team of an existing player id: ids are <team><nnn> in the workbook (4027 = England)
    for pid, p in players.items():
        by_name[p[0]].append(int(pid))
    for cid, sides in world['xi'].items():
        for tid, lst in sides.items():
            for pid in lst[:11]:
                by_name_team[(players[str(pid)][0], int(tid))] = pid
    next_id = max(int(k) for k in players) + 1
    tests, txi, bowl = [], {}, collections.defaultdict(lambda: [0, 0, 0])

    def pid_for(name, tid):
        nonlocal next_id
        if (name, tid) in by_name_team:
            return by_name_team[(name, tid)]
        if len(by_name.get(name, [])) == 1:
            return by_name[name][0]
        pid = next_id; next_id += 1
        players[str(pid)] = [name, 'N', 7, 0, 'd']
        by_name[name].append(pid); by_name_team[(name, tid)] = pid
        return pid

    with zipfile.ZipFile(ZIP) as z:
        for fn in sorted(z.namelist()):
            if not fn.endswith('.json'):
                continue
            d = json.loads(z.read(fn))
            info = d.get('info', {})
            if info.get('match_type') != 'Test':
                continue
            date = info['dates'][0]
            teams = info.get('teams', [])
            if date < start or len(teams) != 2 or not all(t in tid_of for t in teams):
                continue
            cid = fn.rsplit('/', 1)[-1][:-5]
            side = {}
            for tname in teams:
                tid = tid_of[tname]
                names = list(info.get('players', {}).get(tname, []))
                order = []
                for inn in d.get('innings', []):  # batting order = order of appearance at the crease
                    if inn.get('team') != tname:
                        continue
                    for ov in inn.get('overs', []):
                        for dl in ov.get('deliveries', []):
                            for nm in (dl.get('batter'), dl.get('non_striker')):
                                if nm and nm not in order:
                                    order.append(nm)
                    break
                order += [n for n in names if n not in order]
                order = order[:11]
                if len(order) < 11:
                    break
                ids = [pid_for(n, tid) for n in order]
                # Cricsheet has no captain field and no keeper flag: the keeper is whoever made a stumping,
                # otherwise -1; the game fills both from the team's nearest real ODI XI.
                stumpers = {f.get('name') for inn in d.get('innings', []) if inn.get('team') != tname
                            for ov in inn.get('overs', []) for dl in ov.get('deliveries', []) for w in dl.get('wickets', [])
                            if w.get('kind') == 'stumped' for f in w.get('fielders', [])}
                wk = next((i for i, n in enumerate(order) if n in stumpers), -1)
                side[tid] = ids + [wk, -1]
            if len(side) != 2:
                continue
            # Test bowling figures, for players without an ODI rating
            for inn in d.get('innings', []):
                bat_t = inn.get('team')
                bowl_t = next(t for t in teams if t != bat_t)
                for ov in inn.get('overs', []):
                    for dl in ov.get('deliveries', []):
                        pid = pid_for(dl['bowler'], tid_of[bowl_t])
                        ex = dl.get('extras', {})
                        b = bowl[pid]
                        if 'wides' not in ex and 'noballs' not in ex:
                            b[0] += 1
                        b[1] += dl['runs']['batter'] + ex.get('wides', 0) + ex.get('noballs', 0)
                        b[2] += sum(1 for w in dl.get('wickets', []) if w.get('kind') not in ('run out', 'retired hurt', 'obstructing the field'))
            ev = info.get('event', {})
            name = ev.get('name', '') if isinstance(ev, dict) else str(ev)
            tests.append([0, date, name, tid_of[teams[0]], tid_of[teams[1]], info.get('venue', ''), info.get('city', ''), cid])
            txi[cid] = side

    tests.sort(key=lambda r: (r[1], r[7]))
    for i, r in enumerate(tests):
        r[0] = i + 1
    # rate Test-only bowlers by percentile of (runs per over - 9 x wickets per over), as the ODI extractor does
    def val(b):
        return b[1] / (b[0] / 6) - 9.0 * b[2] / (b[0] / 6)
    pool = sorted(val(b) for b in bowl.values() if b[0] >= 1200)
    rated = 0
    for pid, b in bowl.items():
        p = players[str(pid)]
        if p[1] != 'N' or b[0] < 120:
            continue
        pc = sum(1 for x in pool if x < val(b)) / max(1, len(pool))
        r = 1 if pc < .10 else 2 if pc < .30 else 3 if pc < .60 else 4 if pc < .85 else 5
        if b[0] < 1200:
            r = max(r, 4)
        p[1], p[2], p[3], p[4] = 'M', r, 10, 'd'
        rated += 1
    world['tests'] = tests
    world['txi'] = txi
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    print('added', len(tests), 'Tests', len(txi), 'XIs;', rated, 'bowlers rated from Test spells; players now', len(players))


if __name__ == '__main__':
    main()
