# First XI Cricket

Every ODI from June 2002 to January 2026 - the real fixtures, the real XIs and the real bowling plans from Cricsheet - played ball by ball with the First XI run-rate cards. Add Test series whenever you like. One HTML file, no install.

**Play:** download `first-xi.html` and double-click it. Your career saves in the browser (three slots, plus export/import in Settings).

## How it plays
- Each over the bowler's rating picks a run-rate card (RR_3 tight … RR_7 carnage), the match situation shifts it, and **one roll of 1-100** reads all six balls off the card. Roll the dice yourself if you like (Settings → Dice → I roll).
- Wickets only count if their colour can get that batter out: BLUE batters fall only to BLUE wickets, GREEN to BLUE or GREEN, RED to anything. Every player has a colour (from your workbook's BatGroup, or worked out from where he bats and his caps) - so Australia's top order is harder to shift than Kenya's. Classic position-only colours are a setting.
- Real bowling plans where Cricsheet has them; a spell engine otherwise. Bowler ratings from the workbook, or derived from real spells - edit any player's rating on his card.
- Tests: five days, weather, pitch reports, wear, follow-ons and declarations (you can captain them).
- Tournament Centre with pools, NRR, Super Six/Eight tables and brackets. Knockouts are re-seeded from **your** tables - in your timeline Kenya might make the final.
- Your timeline v history: with Cricsheet's real results imported, every match you play shows what really happened, and the dashboard tracks how far your timeline has drifted.
- Rankings (teams and players), players of the series, and the year's awards with a season review.
- Captain your team: bowling changes, who goes in next, attack or defend.
- Career stats by format, records (batting, bowling, fielding, captaincy, partnerships, team), milestones logged live, Man of the Match, "what really happened" bowling figures.

## Developing
```bash
npm install
npm run build      # dist/first-xi.html
npm test           # checks + end-to-end tests + engine stats
```
See `CLAUDE.md` for the architecture and the rules of the game. Data: `python3 tools/extract.py FirstXI.xlsm data/world.json` (needs `openpyxl`); real Tests: `python3 tools/cricsheet_tests.py tests_json.zip`; real ODI results: `python3 tools/cricsheet_odis.py odis_json.zip` (both zips from cricsheet.org/downloads, JSON format).

Match data © [Cricsheet](https://cricsheet.org), used under ODC-BY.
