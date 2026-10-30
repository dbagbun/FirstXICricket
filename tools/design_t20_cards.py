#!/usr/bin/env python3
"""Design the T20 run-rate cards: six cards made for T20, in the workbook's own language.

Usage: python3 tools/design_t20_cards.py [data/world.json] [t20-cards.xlsx]
  Writes the cards into world.json (WORLD.cards T6, T7, T8, T9, T10, T12) and an .xlsx with sheets RR_T6 ... RR_T12
  laid out like the workbook's RR_* sheets (roll 1-100 in column A, balls 1-6 in B-G) to paste into the workbook;
  tools/extract.py then reads them like any other card. Edit TARGETS and run it again.

Each card is 600 balls (100 rolls x 6). TARGETS gives, per card, the runs an over and the share of each kind of ball;
dots, singles, twos and threes fill the rest so the card scores exactly its rate. Wickets keep the colour rule:
BLUE gets anyone, GREEN Nos. 7-11 (and GREEN batters), RED only the tail. Faster cards carry more BLUE wickets -
risk rises with the rate, as RR_7 does in the workbook. The layout is shuffled with a fixed seed (no row holds more
than two wickets or two sixes), so the same targets always give the same cards.
"""
import json, random, sys

# code: (runs an over, % fours, % sixes, % wides, % no-balls, % byes+leg-byes, % wickets BLUE, GREEN, RED)
TARGETS = {
    'T6':  (6.0,   9.0,  2.3, 2.5, 0.3, 1.2, 4.0, 1.2, 1.2),
    'T7':  (7.0,  11.0,  3.2, 2.5, 0.3, 1.2, 4.5, 1.2, 1.2),
    'T8':  (8.0,  13.0,  4.6, 2.7, 0.5, 1.2, 5.2, 1.3, 1.2),
    'T9':  (9.0,  14.5,  6.4, 2.8, 0.5, 1.2, 6.0, 1.4, 1.2),
    'T10': (10.2, 16.5,  8.6, 3.0, 0.7, 1.0, 7.0, 1.5, 1.2),
    'T12': (12.0, 18.0, 12.5, 3.2, 0.8, 1.0, 9.8, 2.0, 1.5),
}
TWOS, THREES = 6.5, 0.4             # % of balls that are twos / threes, every card
# how wickets fall in T20 (shares within each colour): caught in the deep, caught, caught behind, bowled, lbw, run out, stumped
HOW = [('CAUGHT_OFIELD', 30), ('CAUGHT', 18), ('CAUGHT_WK', 12), ('BOWLED', 17), ('LBW', 9), ('RUNOUT', 9), ('STUMPED', 5)]
EXTRA_RUNS = {'B1': 1, 'LB1': 1, 'LB2': 2, 'B4': 4}


def counts(rate, fours, sixes, wd, nb, byes, wb, wg, wr):
    n = 600
    k = lambda pct: round(pct * n / 100)
    c = {'4': k(fours), '6': k(sixes), 'WD': k(wd), 'NB': k(nb), '2': k(TWOS), '3': k(THREES)}
    nbye = k(byes)
    c['LB1'] = round(nbye * .55); c['B1'] = round(nbye * .25); c['LB2'] = nbye - c['LB1'] - c['B1']
    for col, pct in (('BLUE', wb), ('GREEN', wg), ('RED', wr)):
        total = k(pct); left = total
        # the tail (RED) is mostly bowled; others by the T20 mix
        mix = [('BOWLED', 50), ('CAUGHT', 20), ('CAUGHT_OFIELD', 15), ('LBW', 10), ('RUNOUT', 5)] if col == 'RED' else HOW
        tw = sum(w for _, w in mix)
        for i, (how, w) in enumerate(mix):
            m = left if i == len(mix) - 1 else round(total * w / tw)
            m = min(m, left); left -= m
            if m:
                c['W_%s_%s' % (col, how)] = m
    runs_target = round(rate * 100)                        # 600 balls = 100 overs
    runs = 4 * c['4'] + 6 * c['6'] + c['WD'] + c['NB'] + 2 * c['2'] + 3 * c['3'] + sum(EXTRA_RUNS[x] * c.get(x, 0) for x in EXTRA_RUNS)
    used = sum(c.values())
    ones = runs_target - runs
    assert 0 <= ones <= n - used, ('rate out of reach', rate, ones, n - used)
    c['1'] = ones; c['0'] = n - used - ones
    return c


def layout(c, seed):
    """Shuffle the 600 balls into 100 rows, then swap until no row has more than two wickets or two sixes."""
    toks = [t for t, m in c.items() for _ in range(m)]
    rnd = random.Random(seed)
    rnd.shuffle(toks)
    rows = [toks[i * 6:i * 6 + 6] for i in range(100)]
    bad = lambda r: sum(t.startswith('W_') for t in r) > 2 or r.count('6') > 2
    heavy = lambda t: t.startswith('W_') or t == '6'
    for _ in range(20000):
        over = [i for i, r in enumerate(rows) if bad(r)]
        if not over:
            return rows
        i = over[0]; a = next(k for k, t in enumerate(rows[i]) if heavy(t) and bad(rows[i]))
        j = rnd.randrange(100); b = rnd.randrange(6)
        if j == i or heavy(rows[j][b]):
            continue
        rows[i][a], rows[j][b] = rows[j][b], rows[i][a]
        if bad(rows[j]):
            rows[i][a], rows[j][b] = rows[j][b], rows[i][a]
    raise SystemExit('no layout found')


def stats(rows):
    flat = [t for r in rows for t in r]
    runs = sum(int(t) if t.isdigit() else EXTRA_RUNS.get(t, 1 if t in ('WD', 'NB') else 0) for t in flat)
    w = lambda col: sum(t.startswith('W_' + col) for t in flat)
    return {'rpo': round(runs / 100, 2), 'dots': round(100 * flat.count('0') / 600, 1), '4s': round(100 * flat.count('4') / 600, 1),
            '6s': round(100 * flat.count('6') / 600, 1), 'wkts B/G/R': '%d/%d/%d' % (w('BLUE'), w('GREEN'), w('RED'))}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'data/world.json'
    xlsx = sys.argv[2] if len(sys.argv) > 2 else None
    world = json.load(open(out))
    cards = {}
    for i, (code, t) in enumerate(TARGETS.items()):
        cards[code] = layout(counts(*t), 2024 + i)
        print('RR_' + code, stats(cards[code]))
    world['cards'].update(cards)
    json.dump(world, open(out, 'w'), separators=(',', ':'))
    if xlsx:
        import openpyxl
        from openpyxl.styles import Font, PatternFill
        wb = openpyxl.Workbook(); wb.remove(wb.active)
        fill = {'BLUE': '9DC3E6', 'GREEN': 'A9D18E', 'RED': 'F4B183'}
        for code, rows in cards.items():
            ws = wb.create_sheet('RR_' + code)
            ws.append(['Roll', 'Ball 1', 'Ball 2', 'Ball 3', 'Ball 4', 'Ball 5', 'Ball 6'])
            for c in ws[1]:
                c.font = Font(bold=True)
            for k, r in enumerate(rows):
                ws.append([k + 1] + [int(t) if t.isdigit() else t for t in r])   # numbers as numbers, as in the workbook
                for cell in ws[k + 2][1:]:
                    v = str(cell.value)
                    if v.startswith('W_'):
                        cell.fill = PatternFill('solid', fgColor=fill[v.split('_')[1]])
                    elif v in ('4', '6'):
                        cell.font = Font(bold=True)
            for col in 'BCDEFG':
                ws.column_dimensions[col].width = 22
        ws = wb.create_sheet('T20 design', 0)
        ws.append(['Card', 'Runs/over', '% fours', '% sixes', '% wides', '% no-balls', '% byes', '% wkts BLUE', '% GREEN', '% RED', 'Check: as laid out'])
        for code, t in TARGETS.items():
            ws.append(['RR_' + code, *t, json.dumps(stats(cards[code]))])
        ws.append([]); ws.append(['Twos and threes: %s%% and %s%% of balls on every card; dots and singles fill the rest.' % (TWOS, THREES)])
        ws.append(['Paste the RR_T* sheets into the workbook; tools/extract.py reads them. Edit the targets in tools/design_t20_cards.py to redesign.'])
        wb.save(xlsx)
        print('wrote', xlsx)


if __name__ == '__main__':
    main()
