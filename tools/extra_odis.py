#!/usr/bin/env python3
"""Add ODIs that Cricsheet does not have (tools/extra_odis.json) to data/world.json and data/hist.json.gz.

Usage: python3 tools/extra_odis.py [tools/extra_odis.json] [data/world.json] [data/hist.json.gz]
Run it after the Cricsheet tools (they rebuild the fixtures). Idempotent: an entry already present is replaced.
  - fixtures: appended with new numbers after the highest (fixture keys of existing saves stay as they are);
    WORLD.extra lists the numbers added, so the game can tell saves already past them.
  - xi: 'series' = each side's most-used XI over the other games of the series, batting in the order they
    usually batted (average position), keeper / captain the ones who held the job most;
    'from:<cid>' = the XIs of that match.
  - plans: each bowler's average overs over the series (matches he played), scaled to 50 overs (max 10), spells in
    the order they usually came on, two spells each, alternating ends.
  - real: the result as known (+ 't' toss when known); a career filled in from real results records a played match
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


def series_games(world, m, tid):
    """The other real games of this series for that team (same name, within 45 days), with XI and plan."""
    out = []
    for r in world['fixtures']:
        if r[7] == m['cid'] or base(r[2]) != base(m['name']) or days(r[1], m['date']) > 45:
            continue
        x = world['xi'].get(r[7], {}).get(str(tid))
        if x:
            out.append((r[1], x, world['plans'].get(r[7], {}).get(str(tid))))
    return sorted(out)


def series_xi(games):
    cnt, last, pos, wk, cap = Counter(), {}, defaultdict(list), Counter(), Counter()
    for d, x, _ in games:
        for i, p in enumerate(x[:11]):
            cnt[p] += 1; last[p] = d; pos[p].append(i)
        wk[x[x[11]]] += 1; cap[x[x[12]]] += 1
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
            p = x[L.index(ch)]
            if len(first[p]) < played[p]:
                first[p].append(o)
    avg = {p: ov[p] / played[p] for p in xi[:11] if played[p] and ov[p] / played[p] >= 1}
    if not avg:
        return None
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
    pid = lambda name, xi: next(p for p in xi if world['players'][str(p)][0] == name)
    have = {r[7]: r for r in world['fixtures']}
    nxt = max(r[0] for r in world['fixtures']) + 1
    extra = set(world.get('extra', []))
    for m in spec['matches']:
        a, b = tid[m['a']], tid[m['b']]
        if m['cid'] in have:
            no = have[m['cid']][0]
            world['fixtures'] = [r for r in world['fixtures'] if r[7] != m['cid']]
        else:
            no = nxt; nxt += 1
        world['fixtures'].append([no, m['date'], m['name'], a, b, m['venue'], m['city'], m['cid']])
        extra.add(no)
        xi, plans = {}, {}
        for t in (a, b):
            g = series_games(world, m, t)
            if m['xi'] == 'series':
                xi[str(t)] = series_xi(g)
            else:
                xi[str(t)] = world['xi'][m['xi'].split(':')[1]][str(t)]
            plans[str(t)] = series_plan(g, xi[str(t)])
        world['xi'][m['cid']] = xi
        world['plans'][m['cid']] = {k: v for k, v in plans.items() if v}
        allx = xi[str(a)][:11] + xi[str(b)][:11]
        if m.get('abandoned'):
            world['real'][m['cid']] = {'r': [0, 'nr', 0, 0], 'inn': [], 'pom': 0, 'top': [0, 0, 0], 'bb': [0, 0, 0], 'ab': 1}
            hist[m['cid']] = {'t': None, 'r': [0, 'nr', 0, ''], 'pom': 0, 'i': []}
        else:
            w, kind, mar = m['result']
            world['real'][m['cid']] = {'r': [tid[w], kind, mar, 0], 'inn': [[tid[i[0]], i[1], i[2], i[3]] for i in m['inn']],
                                       'pom': pid(m['pom'], allx), 'top': [pid(m['top'][0], allx)] + m['top'][1:],
                                       'bb': [pid(m['bb'][0], allx)] + m['bb'][1:], 'ab': 0}
            if m.get('toss'):
                world['real'][m['cid']]['t'] = [tid[m['toss'][0]], m['toss'][1]]
            hist.pop(m['cid'], None)   # no ball-by-ball card: a real-results career simulates it
    world['extra'] = sorted(extra)
    json.dump(world, open(OUT, 'w'), separators=(',', ':'))
    raw = json.dumps(hist, separators=(',', ':'), ensure_ascii=False).encode()
    with open(HIST, 'wb') as f:
        f.write(gzip.compress(raw, 9, mtime=0))   # as tools/cricsheet_cards.py: the same data gives the same file
    print('added', len(spec['matches']), 'matches; extra fixtures', world['extra'])


main()
