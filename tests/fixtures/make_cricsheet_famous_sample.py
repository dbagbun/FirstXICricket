#!/usr/bin/env python3
"""Write a Cricsheet-format odis_json.zip of twelve full England ODIs (2004-2006) for e2e27: every innings ball by
ball from a scoring profile (openers ~45 and out, No.8 ~18, No.11 2), England batting first and winning, except
the first, where the other side chases and wins by 2 wickets in the last over (a 'close' famous match).
Usage: make_cricsheet_famous_sample.py world.json out.zip"""
import json, sys, zipfile
W = json.load(open(sys.argv[1])); P = W['players']; T = {t['id']: t['name'] for t in W['teams']}
ENG = 4
fx = sorted([f for f in W['fixtures'] if ENG in (f[3], f[4]) and '2004-01-01' <= f[1] <= '2006-12-31' and f[7] in W['xi']], key=lambda f: f[1])[:12]
BAT1 = [45, 30, 40, 35, 25, 20, 15, 18, 8, 5, 2]   # runs by batting position (all out but the last man)
CHASE_LOSE = [20, 15, 30, 25, 20, 15, 10, 8, 5, 2, 1]


def innings(names, bowlers, scores, outs, max_balls=300, target=None):
    """Deliveries for one innings: batter i faces a block of balls scoring scores[i] (fours, singles, dots)."""
    overs, dels, legal, runs, wk = [], [], 0, 0, 0
    def push(d):
        nonlocal dels, legal
        dels.append(d); legal += 1
        if legal % 6 == 0:
            overs.append({'over': legal // 6 - 1, 'deliveries': dels}); dels = []
    # simple sequential model: batter `bat` faces until his runs are scored, then he's out (if outs allows)
    bat, partner, nextin = 0, 1, 2
    plan = scores[:]
    while legal < max_balls and wk < 10:
        r_left = plan[bat]
        if target is not None and runs >= target:
            break
        if r_left > 0:
            r = 4 if r_left >= 4 and legal % 7 == 0 else 1 if legal % 3 == 0 else 0
            if target is not None and runs + r > target:
                r = 1
            plan[bat] -= r; runs += r
            push({'batter': names[bat], 'non_striker': names[partner], 'bowler': bowlers[(legal // 6) % 5], 'runs': {'batter': r, 'extras': 0, 'total': r}})
            continue
        if outs[bat]:
            push({'batter': names[bat], 'non_striker': names[partner], 'bowler': bowlers[(legal // 6) % 5], 'runs': {'batter': 0, 'extras': 0, 'total': 0},
                  'wickets': [{'player_out': names[bat], 'kind': 'caught'}]})
            wk += 1
            if nextin > 10:
                break
            bat, nextin = nextin, nextin + 1
        else:
            bat, partner = partner, bat
            if plan[bat] <= 0 and not outs[bat]:
                push({'batter': names[bat], 'non_striker': names[partner], 'bowler': bowlers[(legal // 6) % 5], 'runs': {'batter': 0, 'extras': 0, 'total': 0}})
    if dels:
        overs.append({'over': len(overs), 'deliveries': dels})
    return overs, runs, wk, legal


with zipfile.ZipFile(sys.argv[2], 'w') as z:
    for k, f in enumerate(fx):
        a, b, cid = f[3], f[4], f[7]
        other = b if a == ENG else a
        xi = {t: [P[str(p)][0] for p in W['xi'][cid][str(t)][:11]] for t in (a, b)}
        if k == 0:   # the famous one: England make 240ish, the other side get there with 2 wickets and 2 balls left
            o1, r1, w1, l1 = innings(xi[ENG], xi[other][6:11], BAT1, [True] * 10 + [False])
            plan = [30, 25, 40, 30, 25, 20, 15, 20, 0, 0, 0]
            plan[8] = r1 + 1 - sum(plan)   # No.9 and No.10 see it home
            o2, r2, w2, l2 = innings(xi[other], xi[ENG][6:11], plan, [True] * 8 + [False] * 3, 300, r1 + 1)
            outcome = {'winner': T[other], 'by': {'wickets': 10 - w2}} if r2 > r1 else {'winner': T[ENG], 'by': {'runs': r1 - r2}}
            inns = [{'team': T[ENG], 'overs': o1}, {'team': T[other], 'overs': o2, 'target': {'runs': r1 + 1, 'overs': 50}}]
            event = {'name': 'Sample Trophy', 'stage': 'Final'}
        else:
            o1, r1, w1, l1 = innings(xi[ENG], xi[other][6:11], BAT1, [True] * 10 + [False])
            o2, r2, w2, l2 = innings(xi[other], xi[ENG][6:11], CHASE_LOSE, [True] * 10 + [False])
            outcome = {'winner': T[ENG], 'by': {'runs': r1 - r2}} if r1 > r2 else {'winner': T[other], 'by': {'wickets': 10 - w2}}
            inns = [{'team': T[ENG], 'overs': o1}, {'team': T[other], 'overs': o2}]
            event = {'name': 'Sample Series'}
        info = {'match_type': 'ODI', 'overs': 50, 'dates': [f[1]], 'teams': [T[a], T[b]], 'outcome': outcome, 'player_of_match': [xi[ENG][0]], 'event': event}
        z.writestr('odis_json/%s.json' % cid, json.dumps({'info': info, 'innings': inns}))
print(len(fx), 'matches')
