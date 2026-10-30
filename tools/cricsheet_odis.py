#!/usr/bin/env python3
"""Add what really happened in every ODI fixture to data/world.json, from Cricsheet's odis_json.zip.

Usage: python3 tools/cricsheet_odis.py odis_json.zip [data/world.json]
  (odis_json.zip from https://cricsheet.org/downloads/ - the JSON format)

For every fixture whose CricsheetID is in the zip:
  WORLD.real[cid] = {"r": [winnerTeamId or 0, "runs"|"wkts"|"tie"|"nr", margin, dl 0/1],
                     "inn": [[batTeamId, runs, wkts, legalBalls], ...],
                     "pom": playerId or 0, "top": [playerId, runs, balls], "bb": [playerId, wkts, runs]}
Famous matches (a close finish, a big chase, a tie, or a knockout) also keep the chase position for "Relive":
  "fam": "close"|"tie"|"big"|"ko", "ev": event name and stage,
  "pos": [[ballsLeft, need, wktsDown, aPid, aRuns, aBalls, bPid, bRuns, bBalls], ...] at the start of the chase and of
         each of its last 10 overs (the two batters at the crease, striker first).
Players are matched by name within that match's XIs. Run it again whenever you update the fixtures.
"""
import json, sys, zipfile

ZIP = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/world.json'
NOT_BOWLER = {'run out', 'retired hurt', 'retired out', 'obstructing the field', 'retired not out'}


def famous(r, inns, info):
    """Why a match is worth reliving, or None: a tie, a close finish, a 300+ chase, or a knockout."""
    stage = str(info.get('event', {}).get('stage', '')).lower()
    if r[1] == 'tie':
        return 'tie'
    if (r[1] == 'runs' and r[2] <= 15) or (r[1] == 'wkts' and r[2] <= 3):
        return 'close'
    if inns and inns[0][1] >= 299 and r[1] != 'nr':
        return 'big'
    if any(k in stage for k in ('final', 'semi', 'quarter')) and r[1] != 'nr':
        return 'ko'
    return None


def main():
    world = json.load(open(OUT))
    tid_of = {t['name']: t['id'] for t in world['teams']}
    players = world['players']
    cids = {f[7] for f in world['fixtures'] if f[7]}
    real, missing, nfam = {}, 0, 0
    with zipfile.ZipFile(ZIP) as z:
        files = {n.rsplit('/', 1)[-1][:-5]: n for n in z.namelist() if n.endswith('.json')}
        for cid in sorted(cids):
            if cid not in files:
                missing += 1
                continue
            d = json.loads(z.read(files[cid]))
            info = d.get('info', {})
            names = {}
            for tid, lst in world['xi'].get(cid, {}).items():
                for pid in lst[:11]:
                    names[players[str(pid)][0]] = pid
            pid = lambda n: names.get(n, 0)
            out = info.get('outcome', {})
            if 'winner' in out:
                by = out.get('by', {})
                kind, margin = ('runs', by['runs']) if 'runs' in by else ('wkts', by.get('wickets', 0))
                r = [tid_of.get(out['winner'], 0), kind, margin, 1 if out.get('method') else 0]
            else:
                r = [0, 'tie' if out.get('result') == 'tie' else 'nr', 0, 0]
            inns, bat, bowl, pos = [], {}, {}, []
            for k, inn in enumerate(d.get('innings', [])[:2]):
                chase = k == 1
                if chase:
                    tgt = inn.get('target', {})
                    target = tgt.get('runs') or (inns[0][1] + 1 if inns else 0)
                    max_balls = int(round(float(tgt.get('overs') or info.get('overs') or 50) * 6))
                    sc, crease = {}, None
                runs = wk = balls = 0
                for ov in inn.get('overs', []):
                    first = True
                    for dl in ov.get('deliveries', []):
                        ex = dl.get('extras', {})
                        if chase and first:
                            first = False
                            left = max_balls - balls
                            if balls == 0 or left <= 60:
                                a, b2 = dl['batter'], dl['non_striker']
                                ra, rb = sc.get(a, [0, 0]), sc.get(b2, [0, 0])
                                pos.append([left, target - runs, wk, pid(a), ra[0], ra[1], pid(b2), rb[0], rb[1]])
                        if chase:
                            x = sc.setdefault(dl['batter'], [0, 0])
                            x[0] += dl['runs']['batter']; x[1] += 0 if 'wides' in ex else 1
                        runs += dl['runs']['total']
                        legal = 'wides' not in ex and 'noballs' not in ex
                        balls += 1 if legal else 0
                        b = bat.setdefault(dl['batter'], [0, 0])
                        b[0] += dl['runs']['batter']; b[1] += 0 if 'wides' in ex else 1
                        w = bowl.setdefault(dl['bowler'], [0, 0])
                        w[1] += dl['runs']['batter'] + ex.get('wides', 0) + ex.get('noballs', 0)
                        for x in dl.get('wickets', []):
                            if x.get('kind') != 'retired hurt':
                                wk += 1
                            if x.get('kind') not in NOT_BOWLER:
                                w[0] += 1
                inns.append([tid_of.get(inn.get('team'), 0), runs, wk, balls])
            top = max(bat.items(), key=lambda kv: (kv[1][0], -kv[1][1]), default=None)
            bb = max(bowl.items(), key=lambda kv: (kv[1][0], -kv[1][1]), default=None)
            pom = (info.get('player_of_match') or [''])[0]
            real[cid] = {'r': r, 'inn': inns, 'pom': pid(pom),
                         'top': [pid(top[0]), top[1][0], top[1][1]] if top else [0, 0, 0],
                         'bb': [pid(bb[0]), bb[1][0], bb[1][1]] if bb else [0, 0, 0]}
            fam = famous(r, inns, info)
            if fam and pos and len(inns) == 2:
                ev = info.get('event', {})
                real[cid].update({'fam': fam, 'ev': ' '.join(str(x) for x in (ev.get('name', ''), ev.get('stage', '')) if x).strip(), 'pos': pos})
                nfam += 1
    world['real'] = real
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    print('real results for', len(real), 'fixtures;', missing, 'not in the zip;', nfam, 'famous matches to relive')


if __name__ == '__main__':
    main()
