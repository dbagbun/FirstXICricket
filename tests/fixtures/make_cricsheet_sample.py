#!/usr/bin/env python3
"""Write a tiny Cricsheet-format tests_json.zip (two England v Australia Tests in 2003) for e2e3.
Usage: python3 tests/fixtures/make_cricsheet_sample.py data/world.json out.zip"""
import json, sys, zipfile
W = json.load(open(sys.argv[1])); P = W['players']
fx = [f for f in W['fixtures'] if f[1] >= '2003-06-01' and {f[3], f[4]} == {1, 4}][0]
xi = W['xi'][fx[7]]
names = {t: [P[str(p)][0] for p in xi[str(t)][:11]] for t in (1, 4)}
names[4][10] = 'ZZ Debutant'
def test(date):
    inns = []
    for bat, bowl in ((4, 1), (1, 4)):
        o, b = names[bat], names[bowl]
        dels = [{'batter': o[0], 'non_striker': o[1], 'bowler': b[10], 'runs': {'batter': 4, 'extras': 0, 'total': 4}},
                {'batter': o[0], 'non_striker': o[1], 'bowler': b[10], 'runs': {'batter': 0, 'extras': 0, 'total': 0},
                 'wickets': [{'player_out': o[0], 'kind': 'stumped', 'fielders': [{'name': b[3]}]}]},
                {'batter': o[2], 'non_striker': o[1], 'bowler': b[9], 'runs': {'batter': 1, 'extras': 1, 'total': 2}, 'extras': {'wides': 1}}]
        inns.append({'team': {1: 'Australia', 4: 'England'}[bat], 'overs': [{'over': 0, 'deliveries': dels}]})
    return {'info': {'match_type': 'Test', 'dates': [date], 'teams': ['England', 'Australia'], 'event': {'name': 'The Ashes'},
                     'venue': "Lord's, London", 'city': 'London', 'players': {'England': names[4], 'Australia': names[1]}}, 'innings': inns}
with zipfile.ZipFile(sys.argv[2], 'w') as z:
    z.writestr('900001.json', json.dumps(test('2003-07-24')))
    z.writestr('900002.json', json.dumps(test('2003-08-01')))
    z.writestr('README.txt', 'sample')
