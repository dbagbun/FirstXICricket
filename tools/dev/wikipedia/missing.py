import json, re
R = json.load(open('odi_rows.json'))
m = [r for r in R if not r['have'] and r['a'] and r['b'] and '2002-06-27' <= r['date'] < '2026-01-28'
     and not re.search('cancel|forfeit|postpone', r['result'], re.I)
     and re.search(r'\bby\b|tied|no result|abandon', r['result'], re.I)]
json.dump(m, open('missing.json', 'w'), indent=0)
print(len(m), 'missing;', sum(r['ab'] for r in m), 'abandoned')
