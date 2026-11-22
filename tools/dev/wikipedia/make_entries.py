"""Build extra_odis.json entries for the missing ODIs.
python3 -I gen.py world.json odi_rows.json missing.json details.json old_extra.json out.json"""
import json, re, sys
from collections import Counter, defaultdict

W = json.load(open(sys.argv[1]))
ROWS = json.load(open(sys.argv[2]))
MISS = json.load(open(sys.argv[3]))
DET = json.load(open(sys.argv[4]))
OLD = json.load(open(sys.argv[5]))
OUT = sys.argv[6]

TN = {t['id']: t['name'] for t in W['teams']}
CODE = {'AUS': 1, 'IND': 3, 'ENG': 4, 'RSA': 5, 'SA': 5, 'PAK': 6, 'SRI': 7, 'SL': 7, 'WIN': 8, 'WI': 8, 'NZL': 9, 'NZ': 9,
        'ZIM': 10, 'BAN': 11, 'KEN': 12, 'IRE': 13, 'NED': 14, 'SCO': 15, 'CAN': 16, 'UAE': 17, 'NAM': 18, 'USA': 19,
        'NEP': 20, 'OMA': 21, 'PNG': 22, 'HKG': 23, 'HK': 23, 'BER': 24, 'JER': 25}
NAME = {t['name'].lower(): t['id'] for t in W['teams']}
NAME.update({'west indies': 8, 'the netherlands': 14, 'netherlands': 14, 'holland': 14, 'uae': 17, 'u.a.e.': 17,
             'united states': 19, 'usa': 19, 'png': 22, 'hong kong': 23, 'world xi': 28, 'icc world xi': 28,
             'asia xi': 27, 'africa xi': 26, 'south africa': 5, 'new zealand': 9, 'sri lanka': 7, 'england': 4})
FIX = {f[7]: f for f in W['fixtures']}
KO = re.compile(r'final|semi|quarter|play-?off|eliminator', re.I)


def tcode(s):
    s = (s or '').strip()
    return CODE.get(s.upper()) or NAME.get(s.lower())


def tname_in(text):
    """The game team named at the start of a sentence ('New Zealand won the toss')."""
    t = text.lower().replace('the ', '', 1) if text.lower().startswith('the ') else text.lower()
    for n in sorted(NAME, key=len, reverse=True):
        if t.startswith(n):
            return NAME[n]
    return None


def base(name):
    return re.sub(r'\s*\((?:Match|Game)\s+\d+\)\s*$', '', name).strip()


def mno(name):
    m = re.search(r'\((?:Match|Game)\s+(\d+)\)\s*$', name)
    return int(m.group(1)) if m else 0


def strip_year(t):
    t = re.sub(r'^\d{4}(?:[–-]\d{2,4})?\s+', '', t)
    t = re.sub(r'\s+(?:in\s+)?\d{4}(?:[–-]\d{2,4})?$', '', t)
    return t.strip()


# --- series groups: every Wikipedia row of the same series, in date order --------------------------------
groups = defaultdict(list)
for r in ROWS:
    groups[r['main'] or (r['page'] + '|' + r['sec'])].append(r)
for g in groups.values():
    g.sort(key=lambda r: (r['date'], int(re.sub(r'\D', '', r['odi']) or 0)))


def naming(r):
    g = groups[r['main'] or (r['page'] + '|' + r['sec'])]
    ko = bool(KO.search(r['stage'] or ''))
    league = [x for x in g if not KO.search(x['stage'] or '')]
    have = [(i, x) for i, x in enumerate(g) if x['have'] and x['cid'] in FIX]
    # a tour (one side in every game, e.g. Sri Lanka in England and Ireland): only games between the same two sides
    common = set.intersection(*[{x['a'], x['b']} for x in g if x['a'] and x['b']] or [set()])
    tour = bool(common) and len({t for x in g for t in (x['a'], x['b']) if t}) > 2
    if tour:
        have = [(i, x) for i, x in have if {x['a'], x['b']} == {r['a'], r['b']}]
        league = [x for x in league if {x['a'], x['b']} == {r['a'], r['b']}]
    if tour and not have:
        t = next(iter(common))
        if t in (r['a'], r['b']):
            o = r['b'] if t == r['a'] else r['a']
            nm = '%s tour of %s' % (TN[t], TN[o])
            return nm if ko else '%s (Match %d)' % (nm, league.index(r) + 1)
    if have:
        names = Counter(base(FIX[x['cid']][2]) for _, x in have)
        nm = names.most_common(1)[0][0]
        if ko:
            return nm
        lab = [(league.index(x), mno(FIX[x['cid']][2])) for _, x in have if x in league and mno(FIX[x['cid']][2])]
        if not lab:   # Cricsheet has only the knockouts: number the league games in order
            return '%s (Match %d)' % (nm, league.index(r) + 1)
        k = league.index(r)
        j, n = min(lab, key=lambda p: abs(p[0] - k))
        return '%s (Match %d)' % (nm, max(1, n + k - j))
    # a series Cricsheet has none of: "<away> tour of <home>" for a tour, else the tournament's name
    sec = re.sub(r'\s*\(.*?\)', '', r['sec']).strip()
    hm = re.match(r'(.*?) in (?:the )?(.*)$', sec)
    if hm and tcode_name(hm.group(1)) and tcode_name(hm.group(2)):
        nm = '%s tour of %s' % (TN[tcode_name(hm.group(1))], TN[tcode_name(hm.group(2))])
    else:
        nm = wiki_tour(r['main']) or (strip_year(r['main']) if r['main'] else sec)
    if ko:
        return nm
    return '%s (Match %d)' % (nm, league.index(r) + 1)


DEMONYM = {'dutch': 14, 'bangladeshi': 11, 'scottish': 15, 'irish': 13, 'kenyan': 12, 'canadian': 16, 'english': 4,
           'australian': 1, 'indian': 3, 'pakistani': 6, 'sri lankan': 7, 'south african': 5, 'new zealand': 9,
           'west indian': 8, 'zimbabwean': 10, 'bermudian': 24, 'namibian': 18, 'nepalese': 20, 'nepali': 20,
           'omani': 21, 'emirati': 17, 'american': 19, 'papua new guinean': 22, 'hong kong': 23}


def wiki_tour(t):
    """'Dutch cricket team in Kenya in 2009-10' -> 'Netherlands tour of Kenya'; 'X cricket team against Y in Z' -> 'X v Y'."""
    m = re.match(r'^(.*?) cricket team (in|against) (?:the )?(.*?)(?: in (?:the )?(.*?))?(?: in \d{4}.*)?$', t or '')
    if not m or m.group(1).lower() not in DEMONYM:
        return None
    x, y = DEMONYM[m.group(1).lower()], tcode_name(m.group(3))
    if not y:
        return None
    return '%s %s %s' % (TN[x], 'tour of' if m.group(2) == 'in' else 'v', TN[y])


def tcode_name(s):
    return NAME.get(s.lower().strip())


# --- venues: Cricsheet's name for the ground when that city has one ----------------------------------------
city_venues = defaultdict(Counter)
for f in W['fixtures']:
    city_venues[(f[6] or '').lower()][f[5]] += 1


ALIAS = {'VCA Ground': 'Vidarbha Cricket Association Ground', 'MSC Ground': 'Madhavrao Scindia Cricket Ground',
         'WACA Ground': 'Western Australia Cricket Association Ground', 'SWALEC Stadium': 'Sophia Gardens',
         'The Gabba': 'Brisbane Cricket Ground, Woolloongabba'}


def venue(v):
    v = re.sub(r'<[^>]*>|\{\{[^}]*\}\}', '', v).strip().strip(',')
    parts = [p.strip() for p in v.split(',')]
    # 'Ground, City' - or 'Ground, City, Country/Province': the last part that is a known city, else the second
    while len(parts) > 2 and (parts[-1].lower() in NAME or parts[-1].lower() not in city_venues):
        parts.pop()
    gr, city = (', '.join(parts[:-1]), parts[-1]) if len(parts) > 1 else (v, '')
    if city and gr.endswith(', ' + city):
        gr = gr[:-len(city) - 2]
    city = re.sub(r'\s*\(.*?\)', '', city)
    if gr in ALIAS:
        return ALIAS[gr], city
    cv = city_venues.get(city.lower())
    if cv:
        if gr in cv:
            return gr, city
        words = set(re.findall(r'[a-z]{4,}', gr.lower())) - {'cricket', 'ground', 'stadium', 'oval', 'park', 'club', 'international', 'association'}
        best = max(cv, key=lambda n: (len(words & set(re.findall(r'[a-z]{4,}', n.lower()))), cv[n]))
        if words & set(re.findall(r'[a-z]{4,}', best.lower())) or len(cv) == 1:
            return best, city
    return gr, city


# --- results ----------------------------------------------------------------------------------------------
def result(r, d):
    txt = r['result']
    dl = 1 if re.search(r'D/L|DLS|Duckworth', txt + ' ' + (d or {}).get('result', '')) else 0
    if re.search(r'tied', txt, re.I):
        return [None, 'tie', 0, dl]
    if re.search(r'no result|abandon', txt, re.I):
        return [None, 'nr', 0, 0]
    w = None
    m = re.search(r'\{\{\s*cr(?:-rt)?\s*\|\s*([^|}]+)', txt)
    if m:
        w = tcode(m.group(1))
    else:
        w = tname_in(re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', txt))
    mm = re.search(r'by\s+(\d+)\s+(run|wicket|wkt)', txt)
    if not (w and mm) and d:
        w = w or tname_in(d['result'])
        mm = mm or re.search(r'by\s+(\d+)\s+(run|wicket)', d['result'])
    if not (w and mm):
        return None
    return [TN[w], 'runs' if mm.group(2) == 'run' else 'wkts', int(mm.group(1)), dl]


def innings(r, d, res):
    """[[team, runs, wkts, balls], ...] in batting order; the template's score1 is team1's, whoever batted first."""
    if not d or not d.get('s1'):
        return None
    t1, t2 = tcode(d['team1']), tcode(d['team2'])
    if {t1, t2} != {r['a'], r['b']}:
        return None
    inn = [[TN[t], s[0], s[1], s[2] if s[2] is not None else 300] for t, s in ((t1, d['s1']), (t2, d.get('s2'))) if s]
    if res and res[0] and len(inn) == 2:
        w = NAME[res[0].lower()]
        if (res[1] == 'wkts' and w == t1) or (res[1] == 'runs' and w == t2):
            inn.reverse()
    return inn


def best(lst, key):
    return max(lst, key=key) if lst else None


MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def nocid(r):
    """A match template with no Cricinfo link (CricketArchive etc.): the same day and the same two sides."""
    day = [int(r['date'][8:]), MON[int(r['date'][5:7]) - 1]]
    for d in DET.get('_nocid', []):
        if d['day'] == day and {tcode(d['team1']), tcode(d['team2'])} == {r['a'], r['b']}:
            return d
    return None


entries, notes = [], Counter()
done = {m['cid'] for m in OLD['matches']}
for r in MISS:
    if r['cid'] in done:
        continue
    d = DET.get(r['cid']) or nocid(r)
    a, b = r['a'], r['b']
    gr, city = venue(r['venue'])
    e = {'cid': r['cid'], 'date': r['date'], 'name': naming(r), 'a': TN[a], 'b': TN[b], 'venue': gr, 'city': city}
    played = d and d.get('s1')
    if r['ab'] and not played:
        e['abandoned'] = True
        notes['abandoned'] += 1
    e['xi'] = 'series'
    # captains (season page) -> the side whose players include him is decided by the tool's name match: give both
    caps = r.get('caps') or []
    if len(caps) == 2:
        e['caps'] = caps
    if not e.get('abandoned'):
        res = result(r, d)
        if not res:
            notes['no result parsed'] += 1
            print('NORES', r['cid'], r['result'], d and d.get('result'), file=sys.stderr)
            continue
        e['result'] = res
        inn = innings(r, d, res)
        if inn and res[0] and len(inn) == 2:
            w, k, mar = res[:3]
            if k == 'wkts' and inn[1][0] == w and inn[1][1] <= inn[0][1]:
                res[3] = 1   # won a chase with fewer runs: a revised target
            ok = (k == 'runs' and inn[0][0] == w and (res[3] or inn[0][1] - inn[1][1] == mar)) or \
                 (k == 'wkts' and inn[1][0] == w and inn[1][2] == 10 - mar and (res[3] or inn[1][1] > inn[0][1]))
            if not ok:
                print('SCORES DISAGREE', r['cid'], res, inn, file=sys.stderr)
                notes['scores disagree: result only'] += 1
                inn, d = None, dict(d, runs1=[], runs2=[], wk1=[], wk2=[])
        if inn:
            e['inn'] = inn
            t1, t2 = tcode(d['team1']), tcode(d['team2'])
            r1, r2, w1, w2 = d['runs1'], d['runs2'], d['wk1'], d['wk2']
            named = defaultdict(list)
            for nm in r1: named[TN[t1]].append([nm[0], 'bat'])
            for nm in r2: named[TN[t2]].append([nm[0], 'bat'])
            for nm in w1: named[TN[t2]].append([nm[0], 'bowl'])
            for nm in w2: named[TN[t1]].append([nm[0], 'bowl'])
            e['named'] = dict(named)
            tb = best(r1 + r2, lambda x: (x[1], -(x[3] or 999)))
            if tb:
                e['top'] = [tb[0], tb[1], tb[3] or 0]
            bw = best([x for x in w1 + w2 if x[2] is not None], lambda x: (x[1], -x[2]))
            if bw:
                e['bb'] = [bw[0], bw[1], bw[2]]
            notes['with scores'] += 1
        else:
            notes['result only'] += 1
        if d and d.get('motm'):
            e['pom'] = d['motm']
        if d and d.get('toss'):
            tt = tname_in(d['toss'])
            if tt in (a, b):
                e['toss'] = [TN[tt], 'bat' if re.search(r'\bbat', d['toss'], re.I) else 'bowl']
    src = 'https://en.wikipedia.org/wiki/' + (r['main'] or r['page']).replace(' ', '_')
    e['source'] = src + ' (%s; ODI %s)' % (r['sec'], r['odi'])
    entries.append(e)

spec = dict(OLD)
spec['about'] = ("ODIs missing from Cricsheet (abandoned, or no ball-by-ball file), added by tools/extra_odis.py. "
                 "Found by comparing Wikipedia's season pages (International cricket in YYYY) with the fixtures; results, "
                 "totals, toss, man of the match, top scorers and best bowling from the Wikipedia series pages. Real XIs are "
                 "not available: xi 'series' = each side's most-used XI in the series (or its nearest real ODIs), with the "
                 "captains and the named players put in; xi 'from:<cid>' = the XIs of that match. Bowling plans = the bowlers' "
                 "average overs.")
spec['matches'] = OLD['matches'] + entries
json.dump(spec, open(OUT, 'w'), indent=1, ensure_ascii=False)
print(len(entries), 'new entries', dict(notes))
