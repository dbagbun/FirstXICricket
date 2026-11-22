"""Parse match templates from Wikipedia series pages -> details.json keyed by cricinfo id."""
import json, glob, re, sys

def blocks(s):
    out = []
    for m in re.finditer(r'\{\{\s*(Single-innings cricket match|Limited[ -]overs? (?:international|match)e?s?|ODI match|Cricket match summary|One Day International|Test match|Two-innings cricket match)\s*\n?\|', s, re.I):
        i, d = m.start(), 0
        j = i
        while j < len(s):
            if s.startswith('{{', j): d += 1; j += 2; continue
            if s.startswith('}}', j):
                d -= 1; j += 2
                if d == 0: break
                continue
            j += 1
        out.append(s[i:j])
    return out

def fields(b):
    body = b[2:-2]
    parts, d, cur = [], 0, ''
    k = 0
    while k < len(body):
        two = body[k:k+2]
        if two in ('{{', '[['): d += 1; cur += two; k += 2; continue
        if two in ('}}', ']]'): d -= 1; cur += two; k += 2; continue
        if body[k] == '|' and d == 0: parts.append(cur); cur = ''; k += 1; continue
        cur += body[k]; k += 1
    parts.append(cur)
    f = {}
    for p in parts[1:]:
        if '=' in p:
            a, v = p.split('=', 1); f[a.strip().lower()] = v.strip()
    return f

def clean(s):
    s = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>', '', s, flags=re.S)
    s = re.sub(r'\{\{\s*(?:cr|cr-rt|cricon|flagicon)\s*\|\s*([^|}]+)[^}]*\}\}', r'{\1}', s)
    s = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', s)
    s = re.sub(r"'''?|<[^>]+>", ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def score(s):
    s = clean(s)
    m = re.match(r'(\d+)(?:/(\d+))?\s*(?:declared|dec|d\b|all out|\(f/o\)|f/o|\s)*(?:\(\s*(\d+)(?:\.(\d))?\s*overs?)?', s, re.I)
    if not m: return None
    w = int(m.group(2)) if m.group(2) else 10
    r = int(m.group(1))
    if m.group(2) and r <= 10 < w:   # Australian style: wickets/runs
        r, w = w, r
    balls = int(m.group(3)) * 6 + int(m.group(4) or 0) if m.group(3) else None
    return [r, w, balls]

def people(s):
    """[[Name]] 64 (88) / [[Name]] 3/40 (10 overs) entries."""
    out = []
    for part in re.split(r'<br\s*/?>|\n|;', s):
        m = re.search(r'\[\[([^|\]]+)(?:\|([^\]]+))?\]\]\s*(\d+)(\*)?(?:/(\d+))?\s*(?:\((\d+)(?:\.\d)?)?', part)
        if m and not re.match(r'extras', m.group(2) or m.group(1), re.I):
            nm = re.sub(r'\s*\(.*?\)', '', m.group(2) or m.group(1)).strip()
            out.append([nm, int(m.group(3)), int(m.group(5)) if m.group(5) else None, int(m.group(6)) if m.group(6) else None, bool(m.group(4))])
    return out

def parse(paths):
    D = {}
    for f in paths:
        d = json.load(open(f))
        s = d['parse']['wikitext']['*']
        for b in blocks(s):
            F = fields(b)
            rep = F.get('report', '') + ' ' + F.get('notes', '')
            rep = rep + ' ' + F.get('scorecard', '')
            cm = re.search(r'(?:scorecard|match|game)/(\d{4,8})(?:\.html|/|\b)', rep) or re.search(r'/(\d{5,8})\.html', rep) \
                or re.search(r'-(\d{5,8})/(?:full-scorecard|scorecard|live-cricket-score|match-report)', rep) \
                or re.search(r'espncricinfo\.com/\S*?(\d{5,8})\b', rep)
            dm = re.search(r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)', clean(F.get('date', '')))
            cid = cm.group(1) if cm and 'espncricinfo' in rep else None
            if not cid and not dm: continue
            rec = {'page': f, 'day': [int(dm.group(1)), dm.group(2)] if dm else None}
            for k in ('team1', 'team2'):
                tm = re.search(r'\{\{\s*(?:cr|cr-rt|cricon)\s*\|\s*([^|}]+)', F.get(k, ''))
                rec[k] = tm.group(1).strip() if tm else clean(F.get(k, ''))
            if 'score-team1-inns1' in F:   # a Test: four innings, listed by side
                rec['test'] = 1
                for t in (1, 2):
                    for i in (1, 2):
                        k = 'team%d-inns%d' % (t, i)
                        sc = F.get('score-' + k, '')
                        rec['s' + k] = score(sc)
                        if rec['s' + k]:
                            rec['s' + k].append(1 if re.search(r'\bdec|\d\s*d\b', sc, re.I) else 0)
                            rec['s' + k].append(1 if re.search(r'f/o|follow', sc, re.I) else 0)
                        rec['r' + k] = people(F.get('runs-' + k, ''))
                        rec['w' + k] = people(F.get('wickets-' + k, ''))
            rec['s1'] = score(F.get('score1', '')); rec['s2'] = score(F.get('score2', ''))
            rec['runs1'] = people(F.get('runs1', '')); rec['runs2'] = people(F.get('runs2', ''))
            rec['wk1'] = people(F.get('wickets1', '')); rec['wk2'] = people(F.get('wickets2', ''))
            mo = re.search(r'\[\[([^|\]]+)(?:\|([^\]]+))?\]\]', F.get('motm', '') or F.get('mom', ''))
            rec['motm'] = re.sub(r'\s*\(.*?\)', '', mo.group(2) or mo.group(1)).strip() if mo else None
            rec['toss'] = clean(F.get('toss', ''))
            rec['result'] = clean(F.get('result', ''))
            rec['rain'] = clean(F.get('rain', ''))
            rec['notes'] = clean(F.get('notes', ''))[:300]
            if cid: D.setdefault(cid, rec)
            else: D.setdefault('_nocid', []).append(rec)
    return D

if __name__ == '__main__':
    D = parse(sorted(glob.glob(sys.argv[1] + '/*.json')))
    json.dump(D, open(sys.argv[2], 'w'), indent=0, ensure_ascii=False)
    print(len(D), 'match templates')
