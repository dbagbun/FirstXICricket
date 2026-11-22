"""Build extra_odis.json entries (fmt Test / T20I) for the missing Tests and T20Is, appended to an existing spec.
python3 -I gen_ti.py world.json test_rows.json t20i_rows.json missing_ti.json details.json spec_in.json out.json
Reuses gen.py's helpers (naming, venues, results, toss)."""
import json, re, sys
from collections import Counter, defaultdict

WJ, TROWS, IROWS, MISSF, DETF, SPEC, OUTF = sys.argv[1:8]
HERE = __file__.rsplit('/', 1)[0]
SRC = open(HERE + '/make_entries.py').read().split('\nMON = [')[0]   # the helper definitions only


def helpers(rows_file):
    g = {'__name__': 'gen_helpers'}
    sys.argv = ['gen.py', WJ, rows_file, MISSF, DETF, SPEC, '/dev/null']
    exec(SRC, g)
    return g


MISS = json.load(open(MISSF))
DET = json.load(open(DETF))
spec = json.load(open(SPEC))
done = {m['cid'] for m in spec['matches']}
MONS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
entries, notes = [], Counter()


def people_best(lst, key):
    return max(lst, key=key) if lst else None


for fmt, rows_file, LK in (('Test', TROWS, 'tests'), ('T20I', IROWS, 't20s')):
    G = helpers(rows_file)
    W, TN, NAME, tcode, tname_in, venue = G['W'], G['TN'], G['NAME'], G['tcode'], G['tname_in'], G['venue']
    G['FIX'] = FIX = {f[7]: f for f in W[LK]}
    naming = G['naming']

    def nocid(r):
        day = [int(r['date'][8:]), MONS[int(r['date'][5:7]) - 1]]
        for d in DET.get('_nocid', []):
            if d['day'] == day and {tcode(d['team1']), tcode(d['team2'])} == {r['a'], r['b']}:
                return d
        return None

    def test_result(r, d):
        """[winner, runs|wkts|inns|draw|tie, margin, 0]: the series page's result when it has one (the season
        tables have the odd slip), else the season row."""
        if d and d.get('result') and r.get('_row') is None:
            x = test_result(dict(r, result=d['result'], _row=1), None)
            if x:
                return x
        txt = r['result']
        if re.search(r'drawn|draw\b', txt, re.I):
            return [None, 'draw', 0, 0]
        if re.search(r'tied', txt, re.I):
            return [None, 'tie', 0, 0]
        m = re.search(r'\{\{\s*cr(?:-rt)?\s*\|\s*([^|}]+)', r['result'])
        w = tcode(m.group(1)) if m else tname_in(re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', r['result'])) or (d and tname_in(d['result']))
        mi = re.search(r'innings and\s+(\d+)\s+run', txt)
        if w and mi:
            return [TN[w], 'inns', int(mi.group(1)), 0]
        mm = re.search(r'by\s+(\d+)\s+(run|wicket|wkt)', txt)
        if w and mm:
            return [TN[w], 'runs' if mm.group(2) == 'run' else 'wkts', int(mm.group(1)), 0]
        return None

    def test_innings(r, d, res):
        """Chronological innings [team, runs, wkts, balls, declared] from a Test match template, checked against
        the result (else None)."""
        if not d or not d.get('test'):
            return None
        t1, t2 = tcode(d['team1']), tcode(d['team2'])
        if {t1, t2} != {r['a'], r['b']}:
            return None
        s = {k: d.get('s' + k) for k in ('team1-inns1', 'team2-inns1', 'team1-inns2', 'team2-inns2')}
        if not s['team1-inns1']:
            return None
        fo = bool(s['team2-inns2'] and s['team2-inns2'][4]) or (s['team2-inns2'] and not s['team1-inns2'])
        normal, follow = ['team1-inns2', 'team2-inns2'], ['team2-inns2', 'team1-inns2']

        def build(second):
            inn = []
            for k in ['team1-inns1', 'team2-inns1'] + second:
                x = s[k]
                if not x:
                    continue
                t = t1 if k.startswith('team1') else t2
                balls = x[2] if x[2] is not None else round(x[0] / 3.0 * 6)
                inn.append([TN[t], x[0], x[1], balls, x[3]])
            return inn

        def fits(inn):
            if not res or res[1] in ('draw', 'tie'):
                return True
            tot = Counter()
            for i in inn:
                tot[i[0]] += i[1]
            w, k, mar = res[:3]
            lose = TN[t2] if w == TN[t1] else TN[t1]
            return (k == 'runs' and inn[-1][0] == lose and tot[w] - tot[lose] == mar) or \
                   (k == 'wkts' and inn[-1][0] == w and inn[-1][2] == 10 - mar and tot[w] > tot[lose]) or \
                   (k == 'inns' and sum(1 for i in inn if i[0] == w) == 1 and tot[w] - tot[lose] == mar)
        # the order the template marks (f/o), else whichever order fits the result (an unmarked follow-on)
        for second in ((follow, normal) if fo else (normal, follow)):
            inn = build(second)
            if fits(inn):
                return inn
        print('TEST SCORES DISAGREE', r['cid'], res, build(follow if fo else normal), file=sys.stderr)
        return None

    for r in MISS:
        if r['fmt'] != fmt or r['cid'] in done:
            continue
        d = DET.get(r['cid']) or nocid(r)
        a, b = r['a'], r['b']
        gr, city = venue(r['venue'])
        # the series' name as the real games of it have it (Tests and T20Is carry no match numbers)
        name = re.sub(r'\s*\((?:Match|Game)\s+\d+\)\s*$', '', naming({k: v for k, v in r.items() if k != 'fmt'}))
        e = {'fmt': fmt, 'cid': r['cid'], 'date': r['date'], 'name': name, 'a': TN[a], 'b': TN[b], 'venue': gr, 'city': city}
        if fmt == 'T20I' and re.search(r"T20 World Cup|World Twenty20", (r['main'] or '') + ' ' + r['sec']) and not re.search('Qualifier', (r['main'] or '') + r['sec']):
            e['wc'] = 1
        played = d and (d.get('s1') or d.get('steam1-inns1'))
        if r['ab'] and not played:
            e['abandoned'] = True
            notes[fmt + ' abandoned'] += 1
        e['xi'] = 'series'
        if len(r.get('caps') or []) == 2:
            e['caps'] = r['caps']
        if not e.get('abandoned'):
            res = test_result(r, d) if fmt == 'Test' else G['result'](r, d)
            if not res:
                notes[fmt + ' no result parsed'] += 1
                print('NORES', fmt, r['cid'], r['result'], file=sys.stderr)
                continue
            e['result'] = res
            named = defaultdict(list)
            if fmt == 'Test':
                inn = test_innings(r, d, res)
                if inn:
                    t1, t2 = tcode(d['team1']), tcode(d['team2'])
                    bats, bowls = [], []
                    for t, o in ((t1, t2), (t2, t1)):
                        n = 'team1' if t == t1 else 'team2'
                        for i in (1, 2):
                            for x in d['r%s-inns%d' % (n, i)]:
                                named[TN[t]].append([x[0], 'bat']); bats.append(x)
                            for x in d['w%s-inns%d' % (n, i)]:
                                named[TN[o]].append([x[0], 'bowl']); bowls.append(x)
            else:
                inn = G['innings'](r, d, res)
                if inn and res[0] and len(inn) == 2:
                    w, k, mar = res[:3]
                    if k == 'wkts' and inn[1][0] == w and inn[1][1] <= inn[0][1]:
                        res[3] = 1
                    ok = (k == 'runs' and inn[0][0] == w and (res[3] or inn[0][1] - inn[1][1] == mar)) or \
                         (k == 'wkts' and inn[1][0] == w and inn[1][2] == 10 - mar and (res[3] or inn[1][1] > inn[0][1]))
                    if not ok:
                        print('T20 SCORES DISAGREE', r['cid'], res, inn, file=sys.stderr)
                        inn = None
                if inn:
                    for x in inn:
                        if x[3] == 300:
                            x[3] = 120   # gen.py's default is the ODI 50 overs
                    t1, t2 = tcode(d['team1']), tcode(d['team2'])
                    for x in d['runs1']: named[TN[t1]].append([x[0], 'bat'])
                    for x in d['runs2']: named[TN[t2]].append([x[0], 'bat'])
                    for x in d['wk1']: named[TN[t2]].append([x[0], 'bowl'])
                    for x in d['wk2']: named[TN[t1]].append([x[0], 'bowl'])
                    bats, bowls = d['runs1'] + d['runs2'], d['wk1'] + d['wk2']
            if inn:
                e['inn'] = inn
                e['named'] = dict(named)
                tb = people_best(bats, lambda x: (x[1], -(x[3] or 999)))
                if tb:
                    e['top'] = [tb[0], tb[1], tb[3] or 0]
                bw = people_best([x for x in bowls if x[2] is not None], lambda x: (x[1], -x[2]))
                if bw:
                    e['bb'] = [bw[0], bw[1], bw[2]]
                notes[fmt + ' with scores'] += 1
            else:
                notes[fmt + ' result only'] += 1
            if d and d.get('motm'):
                e['pom'] = d['motm']
            if d and d.get('toss'):
                tt = tname_in(d['toss'])
                if tt in (r['a'], r['b']):
                    e['toss'] = [TN[tt], 'bat' if re.search(r'\bbat', d['toss'], re.I) else 'bowl']
        src = 'https://en.wikipedia.org/wiki/' + (r['main'] or r['page']).replace(' ', '_')
        e['source'] = src + ' (%s; %s %s)' % (r['sec'], fmt, r['odi'])
        entries.append(e)

spec['matches'] = spec['matches'] + entries
spec['about'] = spec['about'].replace('ODIs missing from Cricsheet', 'ODIs, Tests and T20Is missing from Cricsheet')
json.dump(spec, open(OUTF, 'w'), indent=1, ensure_ascii=False)
print(len(entries), 'new entries', dict(notes))
