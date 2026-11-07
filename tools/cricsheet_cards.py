#!/usr/bin/env python3
"""Real scorecards from Cricsheet's ball-by-ball data, for careers that start later with the years before filled in
from real results (the game's prefillTo).

Usage: python3 tools/cricsheet_cards.py data/world.json data/hist.json.gz tests.zip odis.zip t20s.zip
  Run after cricsheet_tests.py (Tests and --t20) and cricsheet_plans.py. Reads the XIs from world.json and writes the
  scorecards, gzipped, to hist.json.gz; tools/build.js embeds that as base64 (HIST_GZ), unpacked only when needed.

hist[cid] = {t:[tossTid, 'bat'|'bowl'], r:[winnerTid, type, margin, method], so:superOverWinnerTid,
                   pom:pid, fo:followOn, i:[innings...]}
  type: runs | wkts | inns | draw | tie | nr; method: '' or 'D/L' (any rain rule)
  innings: [batTid, runs, wkts, legalBalls, why, [b, lb, wd, nb], bt, bw, fow, parts, ov, target, maxOv]
    bt:    [batIdx, r, b, 4s, 6s, how, bowlerIdx, fielderIdx, ballsTo50, ballsTo100]   (how '' = not out)
    bw:    [bowlIdx, legalBalls, maidens, runs, wkts, wides, noBalls]
    fow:   [score, batIdx, legalBalls]   (the n-th is the n-th wicket)
    parts: [aIdx, bIdx, runs, legalBalls, wkt, broken, aRuns, bRuns]
    ov:    the runs of each over as one character, chr(48 + runs) (wickets per over come from fow)
  (no batter-v-bowler head-to-heads: they'd double the size)
  Batting indices point into the batting side's real XI (WORLD.xi / txi / t20xi), bowling and fielding ones into the
  fielding side's; -1 = not in the XI (a substitute fielder).
"""
import json, sys, zipfile, collections

import gzip
OUT = sys.argv[1]
HIST = sys.argv[2]
ZIPS = sys.argv[3:]
CREDIT = {'bowled': 'b', 'lbw': 'lbw', 'caught': 'ct', 'caught and bowled': 'ct', 'stumped': 'st', 'hit wicket': 'hw'}
OTHER = {'run out': 'ro', 'retired out': 'rto', 'obstructing the field': 'obs', 'handled the ball': 'obs', 'timed out': 'to'}
NOT_OUT = {'retired hurt', 'retired not out'}


def card(d, rows, players, tid_of):
    info = d['info']
    teams = info['teams']
    names = {tid_of[t]: [players[str(p)][0] for p in rows[str(tid_of[t])][:11]] for t in teams}
    idx = {t: {n: i for i, n in enumerate(ns)} for t, ns in names.items()}
    wk = {t: rows[str(t)][11] for t in names}
    allp = {}
    for t in names:
        for i, n in enumerate(names[t]):
            allp.setdefault(n, rows[str(t)][i])
    inns, so = [], 0
    real = [inn for inn in d.get('innings', []) if not inn.get('super_over')]
    for k, inn in enumerate(real):
        bat = tid_of[inn['team']]
        fld = next(tid_of[t] for t in teams if tid_of[t] != bat)
        bi, fi = idx[bat], idx[fld]
        B = collections.OrderedDict()   # batter -> [idx, r, b, 4, 6, how, bowler, fielder, b50, b100]
        W = collections.OrderedDict()   # bowler -> [idx, balls, md, runs, w, wd, nb]
        ex = [0, 0, 0, 0]
        runs = wk_n = lb = 0
        fow, parts, ov = [], [], []
        part = None

        def batter(n):
            if n not in B:
                B[n] = [bi.get(n, -1), 0, 0, 0, 0, '', -1, -1, 0, 0]
            return B[n]

        for o in inn.get('overs', []):
            o_runs = 0
            per_bowler = collections.Counter()
            legal_by = collections.Counter()
            for dl in o.get('deliveries', []):
                st, ns, bw = dl['batter'], dl['non_striker'], dl['bowler']
                b, n = batter(st), batter(ns)
                if part is None:
                    part = {'a': st, 'b': ns, 'r': 0, 'bl': 0, 'w': wk_n + 1, 'ra': 0, 'rb': 0}
                r = dl['runs']
                e = dl.get('extras', {})
                legal = 'wides' not in e and 'noballs' not in e
                if bw not in W:
                    W[bw] = [fi.get(bw, -1), 0, 0, 0, 0, 0, 0]
                Wb = W[bw]
                if 'wides' not in e:
                    b[2] += 1
                b[1] += r['batter']
                if r['batter'] == 4 and not r.get('non_boundary'):
                    b[3] += 1
                if r['batter'] == 6:
                    b[4] += 1
                if b[1] >= 50 and not b[8]:
                    b[8] = b[2]
                if b[1] >= 100 and not b[9]:
                    b[9] = b[2]
                charged = r['batter'] + e.get('wides', 0) + e.get('noballs', 0)
                Wb[3] += charged
                if legal:
                    Wb[1] += 1
                    lb += 1
                    legal_by[bw] += 1
                Wb[5] += 1 if 'wides' in e else 0
                Wb[6] += 1 if 'noballs' in e else 0
                per_bowler[bw] += charged
                ex[0] += e.get('byes', 0); ex[1] += e.get('legbyes', 0); ex[2] += e.get('wides', 0); ex[3] += e.get('noballs', 0)
                runs += r['total']
                o_runs += r['total']
                part['r'] += r['total']
                part['bl'] += 1 if legal else 0
                if st == part['a']:
                    part['ra'] += r['batter']
                elif st == part['b']:
                    part['rb'] += r['batter']
                for w in dl.get('wickets', []):
                    kind = w.get('kind', '')
                    out = batter(w['player_out'])
                    if kind in NOT_OUT:
                        continue
                    fl = [f.get('name') for f in w.get('fielders', []) if f.get('name')]
                    how = CREDIT.get(kind) or OTHER.get(kind, 'obs')
                    out[5] = how
                    if how in ('b', 'lbw', 'ct', 'st', 'hw'):
                        out[6] = fi.get(bw, -1)
                        Wb[4] += 1
                    if kind == 'caught and bowled':
                        out[7] = fi.get(bw, -1)
                    elif fl:
                        out[7] = fi.get(fl[0], -1)
                    if how == 'ct' and out[7] >= 0 and out[7] == wk[fld]:
                        out[5] = 'ctwk'
                    wk_n += 1
                    fow.append([runs, out[0], lb])
                    if part is not None:   # (two wickets off one ball close it once)
                        p = part
                        parts.append([bi.get(p['a'], -1), bi.get(p['b'], -1), p['r'], p['bl'], p['w'], 1, p['ra'], p['rb']])
                    part = None
            ov.append(chr(48 + min(o_runs, 200)))
            # a maiden: six legal balls from one bowler and nothing off him
            for bw, nlegal in legal_by.items():
                if nlegal >= 6 and per_bowler[bw] == 0:
                    W[bw][2] += 1
        if part is not None:
            p = part
            parts.append([bi.get(p['a'], -1), bi.get(p['b'], -1), p['r'], p['bl'], p['w'], 0, p['ra'], p['rb']])
        tg = inn.get('target', {})
        mo = tg.get('overs') or info.get('overs') or 0
        why = 'declared' if inn.get('declared') else 'all out' if wk_n >= 10 else ''
        if not why and tg.get('runs') and runs >= tg['runs']:
            why = 'target'
        if not why and mo and lb >= int(mo) * 6:
            why = 'overs'
        inns.append([bat, runs, wk_n, lb, why, ex, list(B.values()), list(W.values()), fow, parts, ''.join(ov),
                     tg.get('runs', 0), mo])
    oc = info.get('outcome', {})
    method = 'D/L' if oc.get('method') in ('D/L', 'DLS', 'VJD') else ''
    if oc.get('winner'):
        by = oc.get('by', {})
        w = tid_of.get(oc['winner'], 0)
        if 'innings' in by:
            res = [w, 'inns', by.get('runs', 0), method]
        elif 'wickets' in by:
            res = [w, 'wkts', by['wickets'], method]
        else:
            res = [w, 'runs', by.get('runs', 0), method]
    else:
        r = oc.get('result', 'no result')
        res = [0, {'draw': 'draw', 'tie': 'tie'}.get(r, 'nr'), 0, method]
        if r == 'tie' and oc.get('eliminator'):
            so = tid_of.get(oc['eliminator'], 0)
    toss = info.get('toss', {})
    pom = info.get('player_of_match', [])
    fo = len(real) >= 3 and real[2]['team'] == real[1]['team']
    out = {'t': [tid_of.get(toss.get('winner'), 0), 'bat' if toss.get('decision') == 'bat' else 'bowl'], 'r': res,
           'pom': allp.get(pom[0], 0) if pom else 0, 'i': inns}
    if so:
        out['so'] = so
    if fo:
        out['fo'] = 1
    return out


def main():
    world = json.load(open(OUT))
    players = world['players']
    tid_of = {t['name']: t['id'] for t in world['teams']}
    rows = {'Test': world.get('txi', {}), 'T20': world.get('t20xi', {}), 'ODI': world.get('xi', {})}
    hist, miss, n = {}, collections.Counter(), collections.Counter()
    for zp in ZIPS:
        with zipfile.ZipFile(zp) as z:
            for fn in z.namelist():
                if not fn.endswith('.json'):
                    continue
                cid = fn.rsplit('/', 1)[-1][:-5]
                d = json.loads(z.read(fn))
                mt = d['info'].get('match_type')
                R = rows.get(mt, {}).get(cid)
                if not R or not all(t in tid_of and str(tid_of[t]) in R for t in d['info'].get('teams', [])):
                    continue
                c = card(d, R, players, tid_of)
                hist[cid] = c
                n[mt] += 1
                for I in c['i']:
                    miss['bat'] += sum(1 for b in I[6] if b[0] < 0)
                    miss['bowl'] += sum(1 for b in I[7] if b[0] < 0)
    raw = json.dumps(hist, separators=(',', ':'), ensure_ascii=False).encode()
    with open(HIST, 'wb') as f:
        f.write(gzip.compress(raw, 9, mtime=0))   # mtime 0: the same data gives the same file
    print('scorecards:', dict(n), 'unmatched batters/bowlers:', dict(miss), 'raw %.1f MB, gzipped %.2f MB' % (len(raw) / 1e6, len(gzip.compress(raw, 9)) / 1e6))


if __name__ == '__main__':
    main()
