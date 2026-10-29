# First XI Cricket (HTML)

A single self-contained HTML cricket career sim, ported from the Excel/VBA "First XI" workbook. Every ODI from Jun 2002 to Jan 2026 (Cricsheet fixtures, real XIs and real bowling plans) played ball by ball with the First XI run-rate cards, plus Test cricket. No framework, no runtime dependencies. `npm run build` bundles `src/` + `data/world.json` into **`dist/first-xi.html`** - that one file is the product.

## No Node on your machine?
The repo root holds a prebuilt `first-xi.html` (double-click to open). **After any source or data change, rebuild and copy `dist/first-xi.html` to the repo root before committing** (`npm run check` fails if it's stale).

## The rules (sacred - this is the board game)
- Each over: a run-rate card RR_3 / 4A / 4B / 5 / 6 / 7 is picked by weighted random from the bowler's rating (`CARD_WEIGHTS[fmt][rating]`), shifted by the situation (`situationShift`, port of `CalcSituationShift`; `applyShift` ports `ApplyShift` including its lossy overflow).
- One roll 1-100 per over picks the row; balls 1-6 read columns B-G. A wide/no-ball is re-bowled off a fresh roll, column 1 (`M.cur.comp`).
- Wicket colours (`wicketCounts(colour, cardColour)`): a BLUE batter falls only to BLUE, GREEN to BLUE/GREEN, RED to anything; otherwise the ball is a dot (`ball.voided`, `ball.bcol`).
- Batting colours (`batColour`): classic rule = by position (1-6 BLUE, 7-9 GREEN, 10-11 RED; Settings → Batting colours → Classic, `M.batMode='position'`). Player colours (default): one letter, or two = vs associates + vs Test nations (`BG`). A colour from the workbook's BatGroup or the player card applies exactly; a derived colour is never weaker than his position, except an associate's second letter against a Test nation. Derived in `extract.py` `bat_group`: usual position ≥10 RED, 7-9 GREEN; full-member top order BLUE with `BAT_BLUE_CAPS` (20) caps else GREEN; associate top order BLUE with `BAT_BLUE_VS_FULL` (45) games against full members, else `BG`. Tuned with `tools/dev/strength.js`: full members beat associates ~81% (classic rule: ~50%; real ~80-85%), full v full and associate v associate score as in classic.
- Striker is always the one out. Next batter = batting order[wkts+1]. Odd runs (incl. byes) swap strike on legal balls; end of over swaps.
- Bowling engine (`bowlEngInit`/`chooseBowler`/`bowlEngEndOver`, port of `modBowlingEngine`): ODIs follow the real Cricsheet bowling plan per over (`M.plans`, from BowlingXI OverList) and fall back to the spell engine (spell/rest lengths `SPELLS`, phase bonus, quality, random 0-15). Max 10 overs, no consecutive overs.
- MOTM (`pickMOTM`, port of `modMOTM`): runs×SR/100 + wkts×25 + maidens×10 − econ×3 + ct 10 / st 15 / ro 12 + 50/100/5w bonuses 15/30/40, ×1.25 for the winners.
- Milestones (`MS_DEFS`, port of `modMilestones`): logged once per `fmt:pid:cat:thr` key (`S.msKeys` - normalised ids, so they never re-fire). Fastest 50/100 are checked live at the exact ball (`liveFastest`), never from post-match totals; the first one sets the benchmark and records count after 10 matches in a format.
- Tests are new (Excel only had an MVP): `CARD_WEIGHTS.TEST` (RR_3 most overs, RR_7 the wicket card), 450 overs, 2-over changeovers, weather (`WEATHER_P`), pitches (`PITCHES`, by home region), wear from day 4 (`TEST_WEAR`), innings pressure (`TEST_INN_PRESSURE`), follow-on at 200, AI declarations (`aiShouldDeclare`). Tuned with `tests/engine-stats.js` to ~34 runs a wicket, ~3.4 an over, ~12% draws. Change those constants only with that script.

## Layout
- `src/template.html` - page shell with `/*@@CSS@@*/`, `/*@@DATA@@*/`, `/*@@JS@@*/`
- `src/styles.css` - all CSS (Excel dark palette: navy `#0a0e1a`, panels `#0f172a`/`#1e293b`, cyan `#06b6d4`, gold `#ffd700`)
- `src/js/NN-*.js` - concatenated **in filename order into one global scope** (not modules): top-level names must be unique across files; `const`/`let` are subject to TDZ.
- `data/world.json` - generated, committed: teams, RR cards, fixtures, XIs, bowling plans, players (`[name, style P/S/M/N, rating 1-5 or 7, maxOvers, src h|d, batColour B/G/R/BG or '', batSrc h|d]`), optional `tests`/`txi`.
- `tools/extract.py` - workbook → `data/world.json` (needs `openpyxl`). Bowling ratings: the workbook's Players sheet (by name) wins, else derived from real BowlingXI spells (percentile of runs/over − 9×wkts/over vs full members; associates +1).
- `tools/cricsheet_tests.py` - adds real Tests from Cricsheet's `tests_json.zip` (stdlib only). Captain/keeper unknown in Cricsheet → -1, resolved in `testXI` from the nearest ODI XI.
- `tools/build.js [out] [world.json]`, `tools/check.js`, `tools/dev/` (eval helper, team-strength report)
- `tests/` - jsdom end-to-end tests `e2eN.js`, `engine-stats.js`, `runall.sh`, `seed.js`

## Commands
- `npm install`, `npm run build`, `npm test` (build + checks + all e2e + engine stats; ~30 s), `npm run check`
- `python3 tools/extract.py FirstXI.xlsm data/world.json` after changing the workbook data
- `python3 tools/cricsheet_tests.py tests_json.zip` to add the real Test calendar
- Reproducible: `FXI_SEED=42 node -r ./tests/seed.js tests/e2e1.js dist/first-xi.html`
- Engine tuning: `node tests/engine-stats.js 400 150`; balance: `node tools/dev/strength.js`

## Key architecture
- `01-util` helpers + save compression (`lzPack`/`lzUnpack`, `LZ1:` prefix, from Syndicate HQ). `02-world` indexes WORLD: `FIX` (ODIs, sorted), `TFIX` (real Tests), `SERIES` editions (same name, gaps < 60 days; Test editions prefixed `Test:`), `fixtureXI`, `testXI`, `nearestXI`, `squadAround`, `pAttr` (attribute edits in `S.attrEdits` win).
- `03-engine`: `newMatch` → `doToss` → `bowlBall(M, manualRoll)` (one delivery; returns `{need:'base'|'comp'}` when manual dice need a roll) → `closeInnings` → `nextPhase` → `finishMatch` → global hooks `onMatchEvent`/`onMatchDone`. `bowlOver`/`simInnings`/`simMatch` fast-forward. All match state is plain data in `M` (saved whole as `S.live`).
- `04-career`: `S` (see `newCareer`), `archiveMatch` (compact scorecard: `bt` rows `[pid,r,b,4s,6s,how,bowler,fielder,ballsAt50,ballsAt100]`, `bw` rows `[pid,balls,md,r,w,wd,nb]`, `parts`, `ov`), `applyStats`/`rebuildStats` (per format), milestones.
- `05-tournament`: `edition(sid)` (pools by pairing analysis - see rules below - stage per fixture), `pointsTable` (W4, T/NR 2, NRR with all-out = full overs), `groupTables`, `superTable` (carried points), timeline re-seeding `resolveFixture` (super stage: one-for-one swap inside each pool; knockouts: `resolveKO` SF 1v4/2v3 or A1vB2/B1vA2, QF A1vB4…), `seriesStatus`.
- `06-fixtures-save`: fixture keys `o<no>` (ODI), `r<no>` (real Test), `T<n>.<k>` (Test series you schedule, `S.tests`); `allFixtures` (cached), `buildMatch`, `onMatchDone` (archive → stats → milestones → save), `simFixture`; saves in localStorage `fxi_save_1..3`, slot in `fxi_slot`; ball logs kept for the last `LOG_KEEP` matches.
- `07-records`: `recordsData(fmt)` (cached by match count), qualification `REC_MIN`.
- UI: `08-ui-shell` (nav/`go`/`RENDER`, modal, player card with rating edits), `09-ui-match` (pre-match XI swaps & toss, live view, dice panel, manual roll input, watch mode, scorecard, charts, RR card viewer, "what really happened"), `10-ui-home` (dashboard, bulk sim, Test series creator, fixtures), `11-ui-tour`, `12-ui-records` (records, players, results, milestones), `13-ui-settings-init` (settings, splash, live hooks, `init`).

## Rules learned the hard way (from the Excel version, still true)
- **Stage detection uses team-pairing analysis.** Never match counts (Cricsheet has gaps: 2003 World Cup is missing four games) and never fixture position.
- **Pool membership: both teams** in a fixture must be in the pool.
- **Pool size:** not raw Union-Find and not the opponent-count mode either (the mode breaks on gaps). `detectGroups` takes the largest cap whose capped Union-Find partition is a near-complete round robin (≥75% of in-pool pairs played).
- Labelled fixtures `(Match N)` are league/pool/super games; unlabelled ones are knockouts, except runs longer than QF+SF+F, whose early games are an unlabelled super stage (2003 Super Six).
- **Team IDs** are numbers everywhere (`"003"` → 3). Player ids are global (a player keeps his id across teams).
- **Milestones log live** during simulation, never approximated from post-match totals.

## Gotchas
- New persistent state goes in `newCareer()` and gets a default in `loadSlot` for old saves.
- Check for duplicate top-level names after adding code (`npm run check`).
- Adding a feature = a section in the most relevant `src/js` file (or a new `NN-name.js`), plus a test in `tests/e2eN.js`.
- Phones: `@media (max-width:600px)` at the end of `styles.css`; check new screens at 390px (no horizontal scroll).
- The workbook has no batting figures, so batting colours are proxies (position, caps, caps v full members). Change the thresholds only with `tools/dev/strength.js` (and check `tests/engine-stats.js` for Tests). Weak bowlers bowl the fast cards, which carry the most wickets (RR_7: 52 BLUE) - that's why bowling ratings alone couldn't separate the teams.
