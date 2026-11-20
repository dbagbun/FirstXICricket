#!/usr/bin/env python3
"""Add ODIs that Cricsheet does not have (tools/extra_odis.json) to data/world.json and data/hist.json.gz.

Usage: python3 tools/extra_odis.py [tools/extra_odis.json] [data/world.json] [data/hist.json.gz]
Run it after the Cricsheet tools (they rebuild the fixtures). Idempotent: an entry already present is replaced.
  - fixtures: appended with new numbers after the highest (fixture keys of existing saves stay as they are);
    WORLD.extra lists the numbers added, so the game can tell saves already past them.
  - xi: 'series' = each side's most-used XI over the other games of the series, batting in the order they
    usually batted (average position), keeper / captain the ones who held the job most; a side with no other
    games in the series uses its nearest real ODIs by date (or, failing those, its nearest T20Is);
    'from:<cid>' = the XIs of that match.
    Players known to have played (caps: the captains, either side; named: top scorers, wicket-takers, man of the match) are
    put into the stand-in XI in place of the least-used man in the same kind of role, the captain as captain.
    Names may be Cricsheet names ("MS Atapattu") or full names ("Marvan Atapattu"); they are matched within the
    side's players (surname + first initial, nearest in time); a name not found is left out.
  - plans: each bowler's average overs over the series (matches he played), scaled to 50 overs (max 10), spells in
    the order they usually came on, two spells each, alternating ends.
  - real: the result as known (result [winner|null, runs|wkts|tie|nr, margin, dl 0/1], + 't' toss when known); a career filled in from real results records a played match
    with no ball-by-ball card from these totals alone (07q extraCard); abandoned matches are no-results with no innings (and a HIST card with no innings,
    so a career filled in from real results records them as abandoned).
"""
import gzip, json, re, sys
from collections import Counter, defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else 'tools/extra_odis.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/world.json'
HIST = sys.argv[3] if len(sys.argv) > 3 else 'data/hist.json.gz'
L = 'abcdefghijk'


def base(name):
    return re.sub(r'\s*\((?:Match|Game)\s+\d+\)\s*$', '', name).strip()


def days(a, b):
    from datetime import date
    return abs((date.fromisoformat(a) - date.fromisoformat(b)).days)


def team_games(world, skip):
    """Every real ODI (with plan) and T20I XI of each side, by date: {tid: [(date, xi, plan, kind)]}."""
    out = defaultdict(list)
    for r in world['fixtures']:
        if r[7] in skip:
            continue
        for t, x in world['xi'].get(r[7], {}).items():
            out[int(t)].append((r[1], x, world['plans'].get(r[7], {}).get(t), 'odi', base(r[2])))
    for r in world.get('t20s', []):
        for t, x in world.get('t20xi', {}).get(r[7], {}).items():
            out[int(t)].append((r[1], x, None, 't20', ''))
    for v in out.values():
        v.sort(key=lambda g: g[0])
    return out


def source_games(TG, m, tid):
    """The other real games of this series for that team (same name, within 45 days); else its 4 nearest ODIs;
    else its 4 nearest T20Is."""
    g = [x for x in TG[tid] if x[3] == 'odi' and x[4] == base(m['name']) and days(x[0], m['date']) <= 45]
    for kind in ('odi', 't20'):
        if g:
            break
        g = sorted((x for x in TG[tid] if x[3] == kind), key=lambda x: days(x[0], m['date']))[:4]
    return [(d, x, p) for d, x, p, _, _ in sorted(g)]


def norm(s):
    import unicodedata
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z ]', ' ', s.lower().replace('-', ' ')).split()


def name_score(wiki, cs):
    """How well a full name ("Marvan Atapattu") fits a Cricsheet name ("MS Atapattu"): 0-100."""
    w, c = norm(wiki), norm(cs)
    if not w or not c:
        return 0
    if w == c:
        return 100
    from difflib import SequenceMatcher
    if w[-1] != c[-1] and len(w) == len(c) and SequenceMatcher(None, ' '.join(w), ' '.join(c)).ratio() >= .9:
        return 76   # spelt differently: "Sarfaraz Ahmed" / "Sarfraz Ahmed"
    if w[-1] != c[-1]:
        return 85 if len(w) > 1 and len(c) > 1 and w[-1] == c[0] and w[0] == c[-1] else 0   # given / family name order
    first = cs.split()[0]
    if len(c) > 1 and first.isupper() and len(first) <= 5 and w[0][0] == first[0].lower():
        return 80
    if len(c) > 1 and first.isupper() and len(first) <= 5 and w[0][0] in first.lower():
        return 75   # Sri Lankan style: "DPMD Jayawardene" is Mahela
    if len(c) > 1 and c[0] == w[0]:
        return 85
    if len(c) > 1 and len(w) > 1 and SequenceMatcher(None, c[0], w[0]).ratio() >= .8:
        return 78
    if len(set(w) & set(c)) >= 2:
        return 70
    return 40


def resolver(world, TG):
    P = world['players']

    def find(name, tid, date):
        if not name:
            return 0
        seen = {}
        for d, x, _, _, _ in TG[tid]:
            for p in x[:11]:
                if p and (p not in seen or days(d, date) < seen[p]):
                    seen[p] = days(d, date)
        best = []
        for p, dd in seen.items():
            sc = name_score(name, P[str(p)][0])
            if sc:
                best.append((sc, -dd, p))
        best.sort(reverse=True)
        if not best:
            return 0
        sc, dd, p = best[0]
        if sc >= 70:
            return p
        # surname only: take it when he is the one man of that surname active within two years
        near = [b for b in best if b[0] == 40 and -b[1] <= 730]
        return near[0][2] if len(near) == 1 and -dd <= 730 else 0
    return find


def put_in(xi, plan, games, p, role, pinned):
    """Put player p into a stand-in XI (in place of the least-used man in the same kind of role)."""
    if p in xi[:11]:
        pinned.add(p)
        return
    wk_n = Counter(x[x[11]] for _, x, _ in games if 0 <= x[11] < 11)
    keeper = xi[11]
    is_wk = wk_n.get(p, 0) > 0 or any(x[x[11]] == p for _, x, _ in games if 0 <= x[11] < 11)
    overs = {f[0]: f[1] for f in (plan or {}).get('fig', [])}
    cnt = Counter(q for _, x, _ in games for q in x[:11])
    cands = [i for i in range(11) if xi[i] not in pinned and (i != keeper or is_wk)]
    if not cands:
        return
    if is_wk and keeper in cands:
        i = keeper
    else:
        cands = [i for i in cands if i != keeper] or cands
        pref = [i for i in cands if overs.get(xi[i], 0) > 0] if role == 'bowl' else \
               [i for i in cands if overs.get(xi[i], 0) == 0] if role == 'bat' else cands
        i = min(pref or cands, key=lambda i: (cnt[xi[i]], -i))
    old = xi[i]
    xi[i] = p
    if plan:
        for f in plan['fig']:
            if f[0] == old:
                f[0] = p
    pinned.add(p)


def series_xi(games):
    cnt, last, pos, wk, cap = Counter(), {}, defaultdict(list), Counter(), Counter()
    for d, x, _ in games:
        for i, p in enumerate(x[:11]):
            cnt[p] += 1; last[p] = d; pos[p].append(i)
        if 0 <= x[11] < 11: wk[x[x[11]]] += 1
        if 0 <= x[12] < 11: cap[x[x[12]]] += 1
    xi = sorted(cnt, key=lambda p: (-cnt[p], -int(last[p].replace('-', ''))))[:11]
    xi.sort(key=lambda p: sum(pos[p]) / len(pos[p]))
    k = max(xi, key=lambda p: (wk[p], -xi.index(p)))
    c = max(xi, key=lambda p: (cap[p], -xi.index(p)))
    return xi + [xi.index(k), xi.index(c)]


def series_plan(games, xi):
    ov, played, first = defaultdict(float), Counter(), defaultdict(list)
    for d, x, pl in games:
        for p in x[:11]:
            played[p] += 1
        if not pl:
            continue
        for f in pl['fig']:
            ov[f[0]] += f[1]
        for o, ch in enumerate(pl['map']):
            if ch not in L:   # '.': an over by someone not in the XI
                continue
            p = x[L.index(ch)]
            if len(first[p]) < played[p]:
                first[p].append(o)
    avg = {p: ov[p] / played[p] for p in xi[:11] if played[p] and ov[p] / played[p] >= 1}
    if not avg:
        return None
    for p in reversed(xi[:11]):   # fewer than five bowlers: part-timers from the tail (never the keeper) make it up
        if len(avg) >= 5:
            break
        if p not in avg and p != xi[xi[11]]:
            avg[p] = 1.0
    tot = sum(avg.values())
    raw = {p: min(10.0, v * 50 / tot) for p, v in avg.items()}
    q = {p: int(v) for p, v in raw.items()}
    while sum(q.values()) < 50:   # largest remainder, never past 10
        p = max((p for p in q if q[p] < 10), key=lambda p: raw[p] - q[p] + (avg[p] / 100))
        q[p] += 1
    order = sorted(q, key=lambda p: sum(first[p]) / len(first[p]) if first[p] else 99)
    left = dict(q)
    spell = {p: (q[p] + 1) // 2 for p in q}
    ends, run, seq = [None, None], [0, 0], []
    for o in range(50):
        e = o % 2
        cur = ends[e]
        rem = 50 - o
        other = ends[1 - e]
        # someone who must bowl every other over from here to fit his overs in takes this end
        must = [p for p in order if p != other and left[p] * 2 >= rem]
        if must and cur not in must:
            cur = max(must, key=lambda p: left[p]); ends[e] = cur; run[e] = 0
        elif cur is None or left[cur] == 0 or run[e] >= spell[cur]:
            cand = [p for p in order if left[p] > 0 and p != other and p != cur] or [p for p in order if left[p] > 0 and p != other]
            cur = cand[0]; ends[e] = cur; run[e] = 0
        seq.append(cur); left[cur] -= 1; run[e] += 1
    m = ''.join(L[xi.index(p)] for p in seq)
    fig = [[p, q[p], 0, 0, 0] for p in order]
    return {'map': m, 'fig': fig, 'avg': 1}


def main():
    spec = json.load(open(SRC))
    world = json.load(open(OUT))
    hist = json.load(gzip.open(HIST))
    tid = {t['name']: t['id'] for t in world['teams']}
    have = {r[7]: r for r in world['fixtures']}
    nxt = max(r[0] for r in world['fixtures']) + 1
    extra = set(world.get('extra', []))
    TG = team_games(world, {m['cid'] for m in spec['matches']})
    find = resolver(world, TG)
    unmatched = []
    for m in spec['matches']:
        a, b = tid[m['a']], tid[m['b']]
        if m['cid'] in have:
            no = have[m['cid']][0]
            world['fixtures'] = [r for r in world['fixtures'] if r[7] != m['cid']]
        else:
            no = nxt; nxt += 1
        world['fixtures'].append([no, m['date'], m['name'], a, b, m['venue'], m['city'], m['cid']])
        extra.add(no)
        xi, plans, games = {}, {}, {}
        for t in (a, b):
            g = games[t] = source_games(TG, m, t)
            if m['xi'] == 'series':
                xi[str(t)] = series_xi(g)
            else:
                xi[str(t)] = list(world['xi'][m['xi'].split(':')[1]][str(t)])
            plans[str(t)] = series_plan(g, xi[str(t)])
        # the men known to have played: captains first, then the named batters / bowlers / man of the match
        pinned = {a: set(), b: set()}
        def place(name, t, role):
            p = find(name, t, m['date'])
            if not p:
                unmatched.append((m['cid'], name)); return 0
            put_in(xi[str(t)], plans[str(t)], games[t], p, role, pinned[t])
            return p
        caps = m.get('caps') or []
        if isinstance(caps, dict):
            caps = list(caps.values())
        for name in caps:   # the side whose players include him (season tables don't always list home first)
            t = next((t for t in (a, b) if find(name, t, m['date'])), None)
            if not t:
                unmatched.append((m['cid'], name)); continue
            p = place(name, t, 'cap')
            if p in xi[str(t)][:11]:
                xi[str(t)][12] = xi[str(t)].index(p)
        for tn, lst in (m.get('named') or {}).items():
            for name, role in lst:   # the side given first, else the other (pages differ on whose bowlers are listed where)
                t = next((t for t in (tid[tn], b if tid[tn] == a else a) if find(name, t, m['date'])), None)
                if t:
                    place(name, t, role)
                else:
                    unmatched.append((m['cid'], name))
        world['xi'][m['cid']] = xi
        world['plans'][m['cid']] = {k: v for k, v in plans.items() if v}
        def pid(name):
            if not name: return 0
            for t in (a, b):
                p = find(name, t, m['date'])
                if p and p in xi[str(t)][:11]: return p
            return 0
        if m.get('abandoned'):
            world['real'][m['cid']] = {'r': [0, 'nr', 0, 0], 'inn': [], 'pom': 0, 'top': [0, 0, 0], 'bb': [0, 0, 0], 'ab': 1}
            hist[m['cid']] = {'t': None, 'r': [0, 'nr', 0, ''], 'pom': 0, 'i': []}
        else:
            w, kind, mar = m['result'][:3]
            dl = m['result'][3] if len(m['result']) > 3 else 0
            top, bb = m.get('top') or [None, 0, 0], m.get('bb') or [None, 0, 0]
            world['real'][m['cid']] = {'r': [tid[w] if w else 0, kind, mar, dl],
                                       'inn': [[tid[i[0]], i[1], i[2], i[3]] for i in m.get('inn', [])],
                                       'pom': pid(m.get('pom')), 'top': [pid(top[0])] + top[1:],
                                       'bb': [pid(bb[0])] + bb[1:], 'ab': 0}
            if m.get('toss'):
                world['real'][m['cid']]['t'] = [tid[m['toss'][0]], m['toss'][1]]
            hist.pop(m['cid'], None)   # no ball-by-ball card: a real-results career simulates it
    world['extra'] = sorted(extra)
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    raw = json.dumps(hist, separators=(',', ':'), ensure_ascii=False).encode()
    with open(HIST, 'wb') as f:
        f.write(gzip.compress(raw, 9, mtime=0))   # as tools/cricsheet_cards.py: the same data gives the same file
    print('added', len(spec['matches']), 'matches;', len(extra), 'extra fixtures;', len(unmatched), 'names not matched')
    for c, n in unmatched[:40]:
        print('  not matched:', c, n)


main()
