#!/usr/bin/env python3
"""Add real ODIs played after the workbook's fixture list ends (Jan 2026) from Cricsheet's odis_json.zip.

Usage: python3 tools/cricsheet_new_odis.py odis_json.zip [data/world.json]
  Then re-run, in order: cricsheet_odis.py, cricsheet_plans.py, cricsheet_cards.py, real_summary.py, extra_odis.py
  (cricsheet_odis.py rebuilds WORLD.real from the fixtures, cricsheet_cards.py rebuilds hist.json.gz, so the extra
  ODIs go back in last).

For every male ODI in the zip between two sides in the game, dated after the last workbook fixture and not already a
fixture:
  fixtures: appended with new numbers after the highest ([no, date, "<event> (Match N)", a, b, venue, city, cid]);
            WORLD.extra gets the numbers too, so a save already past them skips them (extraFxCheck), and
            WORLD.newodi lists them (re-runs keep their numbers).
  xi:       the real XI in batting order (order of appearance at the crease, then the rest); players matched by
            (name, side) and then by a unique name (as cricsheet_tests.py), new players get new ids. Keeper = whoever
            made a stumping, else the man in the XI who has kept most for that side; captain = the man who has led the
            side most in the two years before (else ever), else the most-capped.
  plans:    the real bowling plan, one letter per over (a-k into the bowling side's XI, '.' someone not in it), and
            the real figures [pid, overs, maidens, runs, wickets].
New players who bowled at least 10 overs here get a medium-pace rating from their economy and strike rate.
"""
import collections, json, sys, zipfile

ZIP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/world.json'
L = 'abcdefghijk'
NOT_BOWLER = {'run out', 'retired hurt', 'retired out', 'obstructing the field', 'retired not out', 'timed out', 'handled the ball'}


def main():
    world = json.load(open(OUT))
    players = world['players']
    tid_of = {t['name']: t['id'] for t in world['teams']}
    newodi = set(world.get('newodi', []))
    extra = set(world.get('extra', []))
    workbook = [f for f in world['fixtures'] if f[0] not in extra and f[0] not in newodi]
    last = max(f[1] for f in workbook)
    have = {f[7]: f for f in world['fixtures']}
    nxt = max(f[0] for f in world['fixtures']) + 1

    by_name, by_name_team, teams_of = collections.defaultdict(list), {}, collections.defaultdict(set)
    for pid, p in players.items():
        by_name[p[0]].append(int(pid))
    for key in ('xi', 'txi', 't20xi'):
        for cid, sides in world.get(key, {}).items():
            for tid, lst in sides.items():
                for pid in lst[:11]:
                    by_name_team[(players[str(pid)][0], int(tid))] = pid
                    teams_of[pid].add(int(tid))
    next_id = max(int(k) for k in players) + 1
    first_new = next_id

    def pid_for(name, tid):
        nonlocal next_id
        if (name, tid) in by_name_team:
            return by_name_team[(name, tid)]
        if len(by_name.get(name, [])) == 1 and teams_of[by_name[name][0]] <= {tid}:
            return by_name[name][0]
        pid = next_id; next_id += 1
        players[str(pid)] = [name, 'N', 7, 0, 'd', '', 'd']
        by_name[name].append(pid); by_name_team[(name, tid)] = pid
        return pid

    # who has kept / captained for each side in the ODI XIs so far (date order)
    fix_date = {f[7]: f[1] for f in world['fixtures']}
    kept, led, caps = collections.defaultdict(collections.Counter), collections.defaultdict(list), collections.defaultdict(collections.Counter)
    mine = {f[7] for f in world['fixtures'] if f[0] in newodi}   # an earlier run's own picks don't count
    for cid, sides in world['xi'].items():
        if cid in mine:
            continue
        for t, x in sides.items():
            t = int(t)
            for p in x[:11]:
                caps[t][p] += 1
            if 0 <= x[11] < 11 and x[11] != 0:   # index 0 = the workbook's opener fallback
                kept[t][x[x[11]]] += 1
            if 0 <= x[12] < 11:
                led[t].append((fix_date.get(cid, ''), x[x[12]]))
    for key in ('txi', 't20xi'):
        for cid, sides in world.get(key, {}).items():
            for t, x in sides.items():
                if 0 <= x[11] < 11:
                    kept[int(t)][x[x[11]]] += 1

    rows, bowl = [], collections.defaultdict(lambda: [0, 0, 0])
    with zipfile.ZipFile(ZIP) as z:
        for fn in sorted(z.namelist()):
            if not fn.endswith('.json'):
                continue
            cid = fn.rsplit('/', 1)[-1][:-5]
            d = json.loads(z.read(fn))
            info = d.get('info', {})
            teams = info.get('teams', [])
            date = info.get('dates', [''])[0]
            if info.get('match_type') != 'ODI' or info.get('gender', 'male') != 'male' or len(teams) != 2 \
                    or not all(t in tid_of for t in teams):
                continue
            if cid in have and have[cid][0] not in newodi:
                continue
            if date <= last:
                continue
            side, plans = {}, {}
            for tname in teams:
                tid = tid_of[tname]
                names = list(info.get('players', {}).get(tname, []))
                order = []
                for inn in d.get('innings', []):
                    if inn.get('team') != tname:
                        continue
                    for ov in inn.get('overs', []):
                        for dl in ov.get('deliveries', []):
                            for nm in (dl.get('batter'), dl.get('non_striker')):
                                if nm and nm not in order:
                                    order.append(nm)
                    break
                order = (order + [n for n in names if n not in order])[:11]
                if len(order) < 11:
                    break
                ids = [pid_for(n, tid) for n in order]
                stumpers = {f.get('name') for inn in d.get('innings', []) if inn.get('team') != tname
                            for ov in inn.get('overs', []) for dl in ov.get('deliveries', []) for w in dl.get('wickets', [])
                            if w.get('kind') == 'stumped' for f in w.get('fielders', [])}
                wk = next((i for i, n in enumerate(order) if n in stumpers), None)
                if wk is None:
                    wk = max(range(11), key=lambda i: (kept[tid][ids[i]], -i))
                recent = [p for dd, p in led[tid] if dd < date and dd >= str(int(date[:4]) - 2) + date[4:]]
                cnt = collections.Counter(recent) or collections.Counter(p for _, p in led[tid])
                cap = max(range(11), key=lambda i: (cnt[ids[i]], caps[tid][ids[i]], -i))
                side[tid] = ids + [wk, cap]
            if len(side) != 2:
                continue
            # the real bowling plan of each side (the innings it bowled in)
            for inn in d.get('innings', [])[:2]:
                if inn.get('super_over'):
                    continue
                bat = inn.get('team')
                bt = tid_of[next(t for t in teams if t != bat)]
                x = side[bt][:11]
                letters, fig = {}, collections.OrderedDict()
                for ov in inn.get('overs', []):
                    o = ov.get('over', 0)
                    dels = ov.get('deliveries', [])
                    if not dels:
                        continue
                    pid = pid_for(dels[0]['bowler'], bt)
                    letters[o] = L[x.index(pid)] if pid in x else '.'
                    f = fig.setdefault(pid, [pid, 0, 0, 0, 0])
                    f[1] += 1
                    runs = legal = 0
                    for dl in dels:
                        b = pid_for(dl['bowler'], bt)
                        g = fig.setdefault(b, [b, 0, 0, 0, 0])
                        ex = dl.get('extras', {})
                        r = dl['runs']['batter'] + ex.get('wides', 0) + ex.get('noballs', 0)
                        g[3] += r; runs += r
                        if 'wides' not in ex and 'noballs' not in ex:
                            legal += 1; bowl[b][0] += 1
                        bowl[b][1] += r
                        w = sum(1 for k in dl.get('wickets', []) if k.get('kind') not in NOT_BOWLER)
                        g[4] += w; bowl[b][2] += w
                    if runs == 0 and legal >= 6:
                        f[2] += 1
                if letters:
                    m = ''.join(letters.get(o, '.') for o in range(max(letters) + 1))
                    plans[str(bt)] = {'map': m, 'fig': [f for f in fig.values() if f[1]]}
            ev = info.get('event', {})
            name = ev.get('name', '') if isinstance(ev, dict) else str(ev)
            if isinstance(ev, dict) and ev.get('match_number'):
                name += ' (Match %d)' % ev['match_number']
            rows.append((date, cid, name, tid_of[teams[0]], tid_of[teams[1]], info.get('venue', ''), info.get('city', ''),
                         {str(t): v for t, v in side.items()}, plans))

    rows.sort()
    for date, cid, name, a, b, venue, city, xi, plans in rows:
        if cid in have:   # a re-run: same number, same place
            no = have[cid][0]
            i = next(i for i, f in enumerate(world['fixtures']) if f[7] == cid)
            world['fixtures'][i] = [no, date, name, a, b, venue, city, cid]
        else:
            no = nxt; nxt += 1
            world['fixtures'].append([no, date, name, a, b, venue, city, cid])
        world['xi'][cid] = xi
        world['plans'][cid] = plans
        newodi.add(no); extra.add(no)
    # new players: a medium-pace rating from their ODI bowling here (economy less a wicket bonus, as the extractor)
    rated = 0
    for pid, bw in bowl.items():
        p = players[str(pid)]
        if pid < first_new or p[1] != 'N' or bw[0] < 60:
            continue
        v = bw[1] / (bw[0] / 6) - 9.0 * bw[2] / (bw[0] / 6)
        p[1], p[2], p[3], p[4] = 'M', 2 if v < 3.5 else 3 if v < 4.5 else 4 if v < 5.5 else 5, 10, 'd'
        rated += 1
    world['newodi'] = sorted(newodi)
    world['extra'] = sorted(extra)
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    print('ODIs after', last + ':', len(rows), 'added;', next_id - first_new, 'new players (%d rated as bowlers)' % rated)


if __name__ == '__main__':
    main()
