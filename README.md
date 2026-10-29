# First XI Cricket

Every ODI from June 2002 to January 2026 - the real fixtures, the real XIs and the real bowling plans from Cricsheet - played ball by ball with the First XI run-rate cards. Add Test series whenever you like. One HTML file, no install.

**Play:** download `first-xi.html` and double-click it. Your career saves in the browser (three slots, plus export/import in Settings).

## How it plays
- Each over the bowler's rating picks a run-rate card (RR_3 tight … RR_7 carnage), the match situation shifts it, and **one roll of 1-100** reads all six balls off the card. Roll the dice yourself if you like (Settings → Dice → I roll).
- Wickets only count if their colour can get that batter out: top six to BLUE, 7-9 to BLUE or GREEN, the tail to anything.
- Real bowling plans where Cricsheet has them; a spell engine otherwise. Bowler ratings from the workbook, or derived from real spells - edit any player's rating on his card.
- Tests: five days, weather, pitch reports, wear, follow-ons and declarations (you can captain them).
- Tournament Centre with pools, NRR, Super Six/Eight tables and brackets. Knockouts are re-seeded from **your** tables - in your timeline Kenya might make the final.
- Career stats by format, records (batting, bowling, fielding, captaincy, partnerships, team), milestones logged live, Man of the Match, "what really happened" bowling figures.

## Developing
```bash
npm install
npm run build      # dist/first-xi.html
npm test           # checks + end-to-end tests + engine stats
```
See `CLAUDE.md` for the architecture and the rules of the game. Data: `python3 tools/extract.py FirstXI.xlsm data/world.json` (needs `openpyxl`); real Tests: `python3 tools/cricsheet_tests.py tests_json.zip`.

Match data © [Cricsheet](https://cricsheet.org), used under ODC-BY.
