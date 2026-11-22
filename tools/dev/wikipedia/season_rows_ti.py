import json, glob, re, sys
W = json.load(open(sys.argv[1]))
CODE = {'AFG':-1,'QAT':-1,'AUS':1,'IND':3,'ENG':4,'RSA':5,'SA':5,'PAK':6,'SRI':7,'SL':7,'WIN':8,'WI':8,'NZL':9,'NZ':9,'ZIM':10,'BAN':11,'KEN':12,'IRE':13,'NED':14,'SCO':15,'CAN':16,'UAE':17,'NAM':18,'USA':19,'NEP':20,'OMA':21,'PNG':22,'HKG':23,'HK':23,'BER':24,'JER':25}
NAME = {t['name'].lower(): t['id'] for t in W['teams']}
NAME.update({'the west indies':8,'west indies':8,'the netherlands':14,'netherlands':14,'united arab emirates':17,'united states':19,'hong kong':23,'papua new guinea':22,'png':22,'uae':17,'icc world xi':28,'world xi':28,'asia xi':27,'africa xi':26,'afghanistan':-1,'usa':19,'south africa':5,'new zealand':9,'sri lanka':7})
MON = {m: i+1 for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'])}
FMT = sys.argv[2]   # Test | T20I
LIST = W['tests'] if FMT == 'Test' else W['t20s']
have = {r[7] for r in LIST}
bydt = {}
for r in LIST: bydt.setdefault((r[1], min(r[3],r[4]), max(r[3],r[4])), r)
def team(cell):
    m = re.search(r'\{\{\s*(?:cr|cr-rt|cricon|flagicon)\s*\|\s*([^|}]+)', cell, re.I)
    if m:
        k = m.group(1).strip()
        return CODE.get(k.upper()) or NAME.get(k.lower())
    m = re.search(r'\[\[([^|\]]*?)(?: national cricket team)?(?:\|([^\]]*))?\]\]', cell)
    for k in ([m.group(1), m.group(2) or ''] if m else []) + [cell]:
        k = re.sub(r'<[^>]*>|\[|\]', '', k).strip().lower()
        if k in NAME: return NAME[k]
    if re.search(r'world xi', cell, re.I): return 28
    return None
SPECIAL = {'world cricket tsunami appeal': (28, 27), 'icc super series': (1, 28), 'icc world xi in australia': (1, 28), 'afro-asian cup': (26, 27), 'bcci platinum jubilee match': (3, 6), 'afro-asia cup': (27, 26), 'chappell–hadlee trophy': (9, 1), 'abu dhabi series': (7, 6)}
def secteams(sec):
    sec = re.sub(r'\s*\(.*?\)', '', sec).strip()
    sec = re.sub(r'\b[Tt]he ', '', sec)
    sec = re.sub(r' and .*$', '', sec)
    k = sec.lower().strip()
    for n, v in SPECIAL.items():
        if n in k: return v
    hm = re.match(r'(.*?)\s+(?:vs\.?|v|against)\s+(.*?)(?:\s+in\s+.*)?$', sec, re.I)
    if hm: return NAME.get(hm.group(1).lower().strip()), NAME.get(hm.group(2).lower().strip())
    hm = re.match(r'(.*?) in (.*)', sec)
    if hm: return NAME.get(hm.group(2).lower().strip()), NAME.get(hm.group(1).lower().strip())
    return None, None
def yr(page, mon):
    m = re.match(r's_(\d{4})(?:-(\d\d))?\.json', page)
    y = int(m.group(1))
    if m.group(2): return y if mon >= 7 else y + 1
    return y
out, seen = [], set()
for f in sorted(glob.glob('s_*.json')):
    d = json.load(open(f))
    if 'parse' not in d: continue
    s = d['parse']['wikitext']['*']
    sec = ''; main = ''; stage = ''; order = {}; mains = {}; lv = 1; hdr = ''
    for line in s.split('\n'):
        h = re.match(r'^(={2,4})\s*(.*?)\s*\1\s*$', line)
        if h:
            lv = len(h.group(1)); sec = h.group(2); stage = ''
            mains = {k: v for k, v in mains.items() if k < lv}
            main = next((mains[k] for k in sorted(mains, reverse=True)), ''); hdr = ''; continue
        mm = re.search(r'\{\{\s*(?:[Mm]ain(?: article)?|[Ss]ee also)\s*\|\s*([^}|]+)', line)
        if mm and lv not in mains: mains[lv] = main = mm.group(1).strip()
        if line.startswith('!'):
            hl = re.search(r'\[\[([^|\]]+)', line)
            if hl and lv not in mains and re.search(r'Cup|League|Championship|Series|Trophy', hl.group(1)): hdr = hl.group(1).strip()
            st = re.search(r'(Final|Semi|Quarter|Super|Play-?off|Eliminator|Qualifier)', line, re.I)
            if re.search(r'Group|Round|Pool|League|Series|Test|T20I|Twenty20', line, re.I) and not st: stage = ''
            if st: stage = st.group(1)
        m = re.search(r'match/(\d+)\.html\s+' + FMT + r'\s*(?:no\.\s*)?(\d+)(a?)\]', line)
        if not m: continue
        cid, no, ab = m.group(1), m.group(2), m.group(3)
        if cid in seen: continue
        seen.add(cid)
        cells = [c.strip() for c in re.split(r'\|\|', line)]
        cells = [c for c in cells if c != '']
        dm = None
        for c in cells[1:4]:
            dm = re.search(r'(\d{1,2})(?:\s*[–-]\s*\d{1,2})?\s+(' + '|'.join(MON) + ')', c)
            if dm: break
        if not dm: print('NODATE', f, line[:150], file=sys.stderr); continue
        mon = MON[dm.group(2)]; date = '%04d-%02d-%02d' % (yr(f, mon), mon, int(dm.group(1)))
        crs = [team(c) for c in cells[2:-2]]
        tms = [t for t in crs if t]
        if len(tms) >= 2: a, b = tms[0], tms[1]
        else: a, b = secteams(sec)
        if False: print('NOTEAM', f, sec, '|', line[:160], file=sys.stderr)
        di = next(i for i, c in enumerate(cells) if dm.group(0) in c)
        caps = []
        for c in cells[di + 1:-2]:
            if re.search(r'\{\{\s*(?:cr|cr-rt|cricon|flagicon)\b', c, re.I): continue
            pm = re.search(r'\[\[([^|\]]+)(?:\|([^\]]+))?\]\]', c)
            if pm: caps.append(re.sub(r'\s*\(.*?\)', '', pm.group(2) or pm.group(1)).strip())
        result = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', cells[-1])
        venue = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', cells[-2]) if len(cells) > 3 else ''
        order[(f, sec)] = order.get((f, sec), 0) + (0 if stage else 1)
        rec = dict(main=main or hdr, stage=stage, k=0 if stage else order[(f, sec)], cid=cid, odi=no + ab, ab=bool(ab) or 'abandon' in result.lower(), date=date, a=a, b=b, sec=sec, venue=venue, result=result, page=f, caps=caps[:2])
        rec['have'] = cid in have
        rec['out'] = (a == -1 or b == -1)
        if rec['out']: a = b = None; rec['a'] = rec['b'] = None
        if not rec['have'] and a and b:
            for dd in (0,):
                pass
            r = bydt.get((date, min(a,b), max(a,b)))
            if r: rec['have'] = 'bydate:' + r[7]
        out.append(rec)
json.dump(out, open(FMT.lower() + '_rows.json', 'w'), indent=0)
miss = [r for r in out if not r['have']]
print(len(out), FMT, 'rows;', len(miss), 'not in fixtures;', sum(1 for r in miss if r['a'] and r['b']), 'with both teams known to the game;',
      sum(1 for r in miss if r['a'] and r['b'] and r['ab']), 'of them abandoned')
