# First XI Cricket

Every ODI from June 2002 to January 2026 - the real fixtures, the real XIs and the real bowling plans from Cricsheet - played ball by ball with the First XI run-rate cards. Add Test series whenever you like. One HTML file, no install.

**Play:** download `first-xi.html` and double-click it. Your career saves in the browser (three slots); back it up from Settings, or in Chrome/Edge auto-save to a file.

**Install it like an app:** turn on GitHub Pages for this repo (Settings → Pages → deploy from the main branch, root folder) and open `https://<you>.github.io/first-xi/first-xi.html` - "Install" / "Add to Home Screen" then gives you an app that plays offline.

## How it plays
- Each over the bowler's rating picks a run-rate card (RR_3 tight … RR_7 carnage), the match situation shifts it, and **one roll of 1-100** reads all six balls off the card. Roll the dice yourself if you like (Settings → Dice → I roll).
- Wickets only count if their colour can get that batter out: BLUE batters fall only to BLUE wickets, GREEN to BLUE or GREEN, RED to anything. Every player has a colour (from your workbook's BatGroup, or worked out from where he bats and his caps) - so Australia's top order is harder to shift than Kenya's. Classic position-only colours are a setting.
- Real bowling plans where Cricsheet has them; a spell engine otherwise. Bowler ratings from the workbook, or derived from real spells - edit any player's rating on his card.
- Tests: five days, weather, pitch reports, wear, follow-ons and declarations (you can captain them).
- Tournament Centre with pools, NRR, Super Six/Eight tables and brackets. Knockouts are re-seeded from **your** tables - in your timeline Kenya might make the final.
- Coach career: board targets for every series, confidence, contracts, the sack and job offers; 15-man squads, fatigue, injuries and form.
- Rain and D/L in ODIs, super overs in knockouts; T20 internationals (with two provisional fast cards); schedule Test, ODI or T20 series between any sides.
- Build your own tournaments; two-player head-to-head and friendlies on any date.
- Stats lab (filter by year, opponent, country, position, stage; batter v bowler; grounds); varied commentary, highlights, scorecards and season reviews as images.
- Your timeline v history: with Cricsheet's real results imported, every match you play shows what really happened, and the dashboard tracks how far your timeline has drifted.
- Rankings (teams and players), players of the series, and the year's awards with a season review.
- Captain your team: bowling changes, who goes in next, attack or defend.
- Career stats by format, records (batting, bowling, fielding, captaincy, partnerships, team), milestones logged live, Man of the Match, "what really happened" bowling figures.
- DRS and umpires: umpires get lbws and edges wrong; review them (era rules), with an umpire's-call roll.
- Press conferences and back-page headlines; dressing-room morale and media pressure as coach.
- Season planner: the year ahead, projected workloads, rest and rotation.
- Field view, wagon wheels and pitch maps (cosmetic - the dice still decide everything).
- Challenges and achievements; relive famous real chases from their real positions (with Cricsheet data).
- The future after 2026 (generated players and fixtures), a Hall of Fame and all-time XIs, a franchise T20 league with an auction.
- Commentator voice, three broadcast looks and a choice of fonts.

## Developing
```bash
npm install
npm run build      # dist/first-xi.html
npm test           # checks + end-to-end tests + engine stats
```
See `CLAUDE.md` for the architecture and the rules of the game. Data: `python3 tools/extract.py FirstXI.xlsm data/world.json` (needs `openpyxl`); real Tests: `python3 tools/cricsheet_tests.py tests_json.zip`; real ODI results and famous chases to relive: `python3 tools/cricsheet_odis.py odis_json.zip`; batting colours from real averages: `python3 tools/cricsheet_batting.py odis_json.zip tests_json.zip` (run it after the other two; zips from cricsheet.org/downloads, JSON format), then `npm run build`.

Match data © [Cricsheet](https://cricsheet.org), used under ODC-BY. Fonts (Barlow, Barlow Condensed, Oswald, Saira Condensed, Montserrat) are embedded under the SIL Open Font License 1.1 - licences in `fonts/`.
