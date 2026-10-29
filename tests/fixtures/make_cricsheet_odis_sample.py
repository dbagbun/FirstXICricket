#!/usr/bin/env python3
"""Write a small Cricsheet-format odis_json.zip for e2e8: the first three fixtures and the 2003 World Cup final,
each with an outcome, player of the match and a few deliveries. Usage: make_cricsheet_odis_sample.py world.json out.zip"""
import json, sys, zipfile
W = json.load(open(sys.argv[1])); P = W['players']; T = {t['id']: t['name'] for t in W['teams']}
fx = sorted(W['fixtures'], key=lambda f: f[1])
pick = fx[:3] + [f for f in fx if f[7] == '65286']
with zipfile.ZipFile(sys.argv[2], 'w') as z:
    for k, f in enumerate(pick):
        a, b, cid = f[3], f[4], f[7]
        xi = {t: [P[str(p)][0] for p in W['xi'][cid][str(t)][:11]] for t in (a, b)}
        inns = []
        for bat, bowl in ((a, b), (b, a)):
            dels = [{'batter': xi[bat][0], 'non_striker': xi[bat][1], 'bowler': xi[bowl][10], 'runs': {'batter': 4, 'extras': 0, 'total': 4}},
                    {'batter': xi[bat][0], 'non_striker': xi[bat][1], 'bowler': xi[bowl][10], 'runs': {'batter': 0, 'extras': 1, 'total': 1}, 'extras': {'wides': 1}},
                    {'batter': xi[bat][0], 'non_striker': xi[bat][1], 'bowler': xi[bowl][10], 'runs': {'batter': 0, 'extras': 0, 'total': 0},
                     'wickets': [{'player_out': xi[bat][0], 'kind': 'bowled'}]}]
            inns.append({'team': T[bat], 'overs': [{'over': 0, 'deliveries': dels}]})
        outcome = {'winner': T[b], 'by': {'wickets': 3}} if k != 1 else {'result': 'no result'}
        info = {'match_type': 'ODI', 'dates': [f[1]], 'teams': [T[a], T[b]], 'outcome': outcome, 'player_of_match': [xi[b][0]]}
        z.writestr('odis_json/%s.json' % cid, json.dumps({'info': info, 'innings': inns}))
