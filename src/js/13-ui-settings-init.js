// ═══ SETTINGS, SPLASH, LIVE HOOKS & INIT ═══
const GUIDE=`<h2>How First XI works</h2>
<p><b>Every over</b> the bowler's rating picks one of six run-rate cards - RR_3 (tight) up to RR_7 (carnage) - shifted by the match situation:
death overs and steep chases push towards the faster cards, a long tail pulls back. Then <b>one roll of 1-100</b> picks a row, and balls 1-6 are read straight across it.</p>
<p><b>Wides and no-balls</b> are re-bowled off a fresh roll (column 1 of the new row).</p>
<p><b>Wicket colours.</b> A wicket on the card only counts if its colour can get that batter out. Every batter has a colour:
<span style="color:#60a5fa">BLUE</span> batters fall only to BLUE wickets, <span style="color:#4ade80">GREEN</span> to BLUE or GREEN, <span style="color:#f87171">RED</span> to anything. Otherwise it's a dot ball.</p>
<p>Colours come from your workbook's BatGroup where set; otherwise from where he usually bats and his caps. A derived colour is never weaker than his batting position (Nos. 1-6 BLUE, 7-9 GREEN, 10-11 RED),
except that associate batters not yet proven against Test nations are GREEN against them. Settings → Batting colours → Classic plays the original position-only rule.</p>
<p><b>Bowlers</b> follow the real bowling plan of the match where Cricsheet has it, then a spell engine (pace with the new ball and at the death, spin through the middle).
Ratings 1 (elite) to 5 (part-timer) come from your Excel ratings where you set them, otherwise from each bowler's real spells. Edit any of them on a player's card.</p>
<p><b>Rain in ODIs:</b> some matches lose overs. Targets are revised with a Duckworth-Lewis-style resource model (overs left and wickets down; an approximation of the published table), and if fewer than 20 overs are possible for the chasing side it's a no result. A tied knockout goes to a <b>super over</b>.</p>
<p><b>T20s</b> need faster cards than the six in the workbook (RR_7 tops out at 6.7 an over), so they add two <b>provisional</b> cards:
RR_8, built from RR_6 (~8 an over, its GREEN and RED wickets), and RR_9, built from RR_7 (~10 an over, its BLUE and RED wickets) - the wicket colours work exactly as before.
They're a stand-in until you design real ones. Bowlers get 4 overs; innings average ~155.</p>
<p><b>Tests</b> use their own card weights (RR_3 most overs, RR_7 as the wicket card), five days of 90 overs, weather, pitches that wear, follow-ons at 200 and declarations.</p>
<p><b>Your dice:</b> switch Settings → Dice to "I roll" and enter each roll yourself.</p>
<p><b>Captain:</b> Settings → Captaincy → Me, and you captain the team you follow (or both sides): choose who bowls each over (the real bowler of that over is marked),
who goes in next, and whether to attack or defend - attack moves the over one card faster, defend one slower. A batter sent up the order gains at most one colour.</p>
<p><b>Saving:</b> your career lives in this browser (three slots). Back it up from Settings - a reminder appears every ${BACKUP_EVERY} matches - or, in Chrome/Edge on a computer, auto-save to a file. Hosted on a website (e.g. GitHub Pages), the game installs like an app and plays offline.</p>
<p><b>Umpires and DRS:</b> the card is the truth, but the umpire can get an lbw or a caught-behind wrong, or give out a batter the card's colour saved.
The side the call went against may review (Tests 2 an innings, ODIs and T20s 1; one more each from mid-2020; DRS arrives in Tests in 2009, ODIs in 2011, T20s in 2017).
An lbw review rolls 1-100 for <b>umpire's call</b>: 25 or under and the on-field decision stands. A failed review is lost; umpire's call keeps it from October 2017.
As captain you're asked when you play ball by ball or over by over. Settings → Umpires &amp; DRS can turn reviews on for every era, or give you perfect umpires.</p>
<p><b>Press and media:</b> the papers write up every match of the team you follow (the Back pages). As a coach you face the press after every match and before every series:
talk up the board's target and the stakes rise both ways; praise or question a player and he may play a form step up (or down) next time; what you say moves the dressing room and the media pressure.
A buzzing dressing room (75+) lifts a top-order batter a form step, an unhappy one (25 or under) drops one; with pressure at 70+ every defeat costs extra board confidence.</p>
<p><b>Season planner:</b> the year ahead for the side you coach (or pick squads for), and a grid of each man's projected fatigue going into the next eight matches.
Click a cell to rest him for that match - the squad fills the gap and he comes back fresher; "Rest anyone at 60+" does it for you (never in a knockout).</p>
<p><b>Field &amp; shots:</b> the match screen's Field &amp; shots tab shows the field set for the next ball (your Field setting when you captain), a wagon wheel for each batter and a pitch map for each bowler.
They're drawn from each ball but never change it - the card and the roll decide what happens; the picture (and the commentary) decide where. The last ${LOG_KEEP} matches keep them on their scorecards.</p>
<p><b>Knockouts</b> are re-seeded from your own tables once a tournament's league stage is finished (Settings to follow history instead).</p>`;
function openGuide(){openModal(GUIDE);}

RENDER.settings=(el)=>{
  const st=S.settings;
  const slots=SLOT_KEYS.map((_,i)=>readSlot(i));
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,n])=>`<button data-set="${k}" data-val="${v}" class="${String(st[k])===String(v)?'on':''}">${n}</button>`).join('')}</div>`;
  el.innerHTML=`<div class="grid g2">
  <div class="card stack"><h3>Game</h3>
    <div class="spread"><span>Dice</span>${seg('dice',[['auto','Automatic'],['manual','I roll']])}</div>
    <div class="spread"><span>Captaincy (bowling changes, batting order, attitude, declarations)</span>${seg('captain',[['auto','AI'],['manual','Me']])}</div>
    <div class="spread"><span>Ratings &amp; colours</span>${seg('ratings',[['era','By era (form)'],['career','Whole career']])}</div>
    ${S.coach?'':`<div class="spread"><span>Pick squads for the team you follow</span>${seg('selection',[['auto','No (real XIs)'],['me','Yes']])}</div>`}
    <div class="spread"><span>Form (hot and cold streaks change the cards)</span>${seg('form',[['on','On'],['off','Off']])}</div>
    <div class="spread"><span>Umpires &amp; DRS</span>${seg('drs',[['era','Real dates'],['on','DRS always'],['off','Perfect umpires']])}</div>
    <div class="spread"><span>Batting colours</span>${seg('batColours',[['player','Player'],['position','Classic (by position)']])}</div>
    <div class="spread"><span>After the real calendar (2026)</span>${seg('future',[['on','Carry on into the future'],['off','Stop']])}</div>
    <div class="spread"><span>Tournament knockouts</span>${seg('knockouts',[['timeline','My timeline'],['history','History']])}</div>
    ${HAS_REAL?`<div class="spread"><span>Real results (after you play a match)</span>${seg('history',[['after','Show'],['off','Hide']])}</div>`:''}
    <div class="spread"><span>App font</span>${seg('font',APP_FONTS)}</div>
    <div class="spread"><span>Broadcast style</span>${seg('broadcast',BROADCASTS)}</div>
    ${SPEECH?`<div class="spread"><span>Commentator voice</span>${seg('voice',[['false','Off'],['true','On']])}</div>
    ${st.voice?`<div class="spread"><select id="st-voice">${voices().map(v=>`<option ${v.name===st.voiceName?'selected':''}>${esc(v.name)}</option>`).join('')||'<option>Default voice</option>'}</select>
      <label class="row" style="gap:6px">Speed <input type="range" id="st-rate" min="0.8" max="1.4" step="0.05" value="${st.voiceRate||1.05}"></label><button class="btn sm" id="st-say">Test</button></div>`:''}`:''}
    <div class="spread"><span>Sound</span>${seg('sound',[['false','Off'],['true','On']])}</div>
    <div class="spread"><span>TV graphics for wickets &amp; milestones</span>${seg('tv',[['true','On'],['false','Off']])}</div>
    <div class="spread"><span>Watch speed</span>${seg('ballDelay',[[600,'Slow'],[250,'Normal'],[60,'Fast']])}</div>
    <div class="spread"><span>Follow a team</span><select id="st-team"><option value="0">None</option>${[...TEAMS.values()].map(t=>`<option value="${t.id}" ${st.myTeam===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>
    <button class="btn" id="st-guide">How to play</button></div>
  <div class="card stack"><h3>Save slots</h3>
    ${slots.map((d,i)=>`<div class="spread"><div><b>Slot ${i+1}</b>${i===SLOT?' <span class="pill win">active</span>':''}<br><span class="muted">${d?`${esc(d.name)} · ${d.matches.length} matches · ${fmtDate(d.matches.length?d.matches[d.matches.length-1].date:CAREER_START)}`:'empty'}</span></div>
      <div class="row">${d&&i!==SLOT?`<button class="btn sm" data-load="${i}">Load</button>`:''}${!d?`<button class="btn sm" data-new="${i}">New career</button>`:''}${d&&i!==SLOT?`<button class="btn sm warn" data-del="${i}">Delete</button>`:''}</div></div>`).join('')}
    <div class="row"><button class="btn" id="st-exp">Back up now (JSON)</button><label class="btn">Import<input type="file" id="st-imp" accept=".json,application/json" hidden></label>
      ${canSaveToFile()?`<button class="btn" id="st-file">${FILE_HANDLE?'Saving to '+esc(FILE_HANDLE.name):'Auto-save to a file…'}</button>`:''}</div>
    <div class="muted" style="font-size:12px" id="st-storage">${S.backupAt?`Last backup at match ${S.backupAt}.`:'Not backed up yet.'}</div>
    <div class="row"><button class="btn" id="st-rebuild">Rebuild stats from scorecards</button><button class="btn warn" id="st-reset">Start this slot again</button></div></div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Data</h3><p class="sub">${FIX.length.toLocaleString()} ODI fixtures from Cricsheet (${fmtDate(FIX[0].date)} - ${fmtDate(FIX[FIX.length-1].date)}), ${Object.keys(WORLD.xi).length.toLocaleString()} real XIs and bowling plans, ${Object.keys(WORLD.players).length.toLocaleString()} players. Built from ${esc(WORLD.source||'the First XI workbook')}.</p></div>`;
  $$('[data-set]').forEach(b=>b.onclick=()=>{const k=b.dataset.set,v=b.dataset.val;st[k]=k==='ballDelay'?+v:v==='true'?true:v==='false'?false:v;
    if(S.live&&S.live.state!=='done'){if(k==='dice')S.live.manual=v==='manual';if(k==='captain')S.live.manualCaptain=v==='manual'?captainOf(S.live):null;if(k==='batColours')S.live.batMode=v;}
    if(k==='broadcast'||k==='font')applyBroadcast();
    saveGame();rerender();});
  $('#st-team').onchange=e=>{st.myTeam=+e.target.value;saveGame();};
  $('#st-voice')&&($('#st-voice').onchange=e=>{st.voiceName=e.target.value;saveGame();voiceTest();});
  $('#st-rate')&&($('#st-rate').onchange=e=>{st.voiceRate=+e.target.value;saveGame();voiceTest();});
  $('#st-say')&&($('#st-say').onclick=()=>{if(!voiceTest())toast('No voice available in this browser.','warn');});
  if(SPEECH&&!voices().length&&!RENDER.settings.waited){RENDER.settings.waited=1;SPEECH.onvoiceschanged=()=>{if(VIEW==='settings')rerender();};}
  $('#st-guide').onclick=openGuide;
  $$('[data-load]').forEach(b=>b.onclick=()=>{saveGame();if(loadSlot(+b.dataset.load)){LM=null;toast('Loaded.');go('home');}});
  $$('[data-new]').forEach(b=>b.onclick=()=>{saveGame();setSlot(+b.dataset.new);S=null;LM=null;showSplash();});
  $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Delete this save for good?')){try{localStorage.removeItem(SLOT_KEYS[+b.dataset.del]);}catch(e){}rerender();}});
  $('#st-exp').onclick=()=>{backupNow();rerender();};
  $('#st-file')&&($('#st-file').onclick=async()=>{if(await chooseSaveFile())rerender();});
  storageLine().then(t=>{const e=$('#st-storage');if(e&&t)e.textContent+=' '+t;});
  $('#st-imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{if(importCareer(t)){LM=null;toast('Career imported.');go('home');}else toast('That file is not a First XI career.','bad');});};
  $('#st-rebuild').onclick=()=>{rebuildStats();REC_CACHE=null;saveGame();toast('Stats rebuilt from '+S.matches.length+' scorecards.');};
  $('#st-reset').onclick=()=>{if(confirm('Wipe this career and start again from 2002?')){S=null;LM=null;try{localStorage.removeItem(SLOT_KEYS[SLOT]);}catch(e){}showSplash();}};
};

function showSplash(){
  renderNav();
  const slots=SLOT_KEYS.map((_,i)=>readSlot(i));
  $('#view').innerHTML=`<div class="card hi" style="max-width:640px;margin:30px auto"><h1 style="font-size:28px">First XI <span class="cyan">Cricket</span></h1>
    <p class="sub">Every ODI from ${fmtDate(FIX[0].date)} to ${fmtDate(FIX[FIX.length-1].date)}, with the real XIs and bowling plans, played out with the First XI run-rate cards. Add Test series whenever you like.</p>
    <div class="stack"><div class="row"><input type="text" id="sp-name" placeholder="Career name" value="My career"><select id="sp-team"><option value="0">Follow a team (optional)</option>${[...TEAMS.values()].filter(t=>t.full).map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
      <button class="btn pri" id="sp-go">Start a new career</button></div>
      <label class="row" style="gap:6px"><input type="checkbox" id="sp-coach"> Coach the team I follow (board targets, contracts, squads, the sack)</label>
      ${slots.some(Boolean)?`<h3 style="margin-top:10px">Or carry on</h3>${slots.map((d,i)=>d?`<div class="spread"><span>Slot ${i+1}: <b>${esc(d.name)}</b> <span class="muted">${d.matches.length} matches</span></span><button class="btn sm" data-sp="${i}">Load</button></div>`:'').join('')}`:''}
      <button class="btn" id="sp-guide">How it works</button></div></div>`;
  $('#sp-go').onclick=()=>{
    if(readSlot(SLOT)){const free=SLOT_KEYS.findIndex((_,i)=>!readSlot(i));if(free>=0)setSlot(free);else if(!confirm('All three slots are in use. Overwrite slot '+(SLOT+1)+'?'))return;}
    S=newCareer({name:$('#sp-name').value.trim()||'My career',myTeam:+$('#sp-team').value});
    if($('#sp-coach').checked){if(!+$('#sp-team').value){toast('Pick the team to coach.','warn');S=null;return;}startCoach(+$('#sp-team').value);}
    saveGame();go(S.coach?'coach':'home');
  };
  $$('[data-sp]').forEach(b=>b.onclick=()=>{if(loadSlot(+b.dataset.sp))go('home');});
  $('#sp-guide').onclick=openGuide;
}

// live match events -> toasts; end of match -> result
uiMatchHook=(M,e,fast)=>{
  if(M.sim||VIEW!=='match')return;
  const shown=fxEvent(M,e);voiceEvent(M,e);
  if(e.t==='drs'&&e.code==='O'&&M.manualCaptain?.[e.side])achieve('drs');
  if(!shown&&['50','100','200','5w','hat','rain','rainlo','dl','followon','drs'].includes(e.t))toast((/rain|dl/.test(e.t)?'🌧 ':e.t==='followon'?'':'🏏 ')+esc(evText(e)),/rain|dl/.test(e.t)?'warn':'ms');
  if(!shown&&e.t==='innsEnd'&&M.state==='live')toast(esc(evText(e)));
  if(fast)toast('🏆 '+esc(pName(fast.pid))+': '+esc(fast.text),'ms');
};
uiDoneHook=(M,E,ms,pos,aw,cn)=>{
  REC_CACHE=null;
  if(M.sim){SIM_NEWS.pos+=pos?1:0;SIM_NEWS.aw.push(...(aw||[]).map(a=>a.year));return;}
  stopWatch();LM=M;
  const ss=E.sid?seriesStatus(E.sid):null;
  setTimeout(()=>{
    if(VIEW==='match')rerender();
    openModal(`<div class="sub">${esc(E.series)}${E.stage?' · '+esc(E.stage):''}</div><div class="result-big" style="margin:6px 0">${esc(E.result.text)}</div>
      ${E.inns.map(I=>`<div class="spread"><span>${badge(I.bat)} ${esc(teamName(I.bat))}</span><b class="num">${innsShort(I,E.fmt)}</b></div>`).join('')}
      ${E.motm?`<div class="banner" style="margin-top:10px">Man of the Match: <b>${plink(E.motm)}</b></div>`:''}
      ${ss&&SERIES.get(E.sid)?.kind!=='tournament'?`<p class="sub">${esc(ss.text)}</p>`:''}
      ${realOf(E)?`<p class="sub">In history: <b>${esc(realText(realOf(E)))}</b> ${sameAsHistory(E)===false?'<span class="pill ko">history changed</span>':sameAsHistory(E)?'<span class="pill win">as it happened</span>':''}</p>`:''}
      ${pos?`<div class="banner" style="margin-top:10px">Player of the series (${esc(pos.title)}): <b>${plink(pos.pid)}</b></div>`:''}
      ${ms.length?`<h3 style="margin-top:12px">Milestones</h3>${ms.map(m=>`<div>🏅 ${plink(m.pid)} <span class="sub">${esc(m.text)}</span></div>`).join('')}`:''}
      ${cn&&cn.length?`<h3 style="margin-top:12px">From the board room</h3>${cn.map(n=>`<div class="${n.cls==='good'?'green':n.cls==='bad'?'red':''}">${esc(n.text)}</div>`).join('')}`:''}
      ${aw&&aw.length?`<h3 style="margin-top:12px">Season review</h3><div class="stack">${honoursHTML(aw.map(a=>a.year))}</div>`:''}
      <div class="row" style="margin-top:14px"><button class="btn pri" id="r-next">Next fixture</button><button class="btn" id="r-card">Full scorecard</button><button class="btn" id="r-img">Save as image</button></div>`);
    $('#r-img').onclick=()=>downloadCanvas(scorecardImage(E),`first-xi-${E.date}-${teamShort(E.teams[0])}-v-${teamShort(E.teams[1])}.png`);
    if(S.sandbox&&S.sandbox.res&&M.challenge){const R=S.sandbox.res;
      $('#modal-box').insertAdjacentHTML('afterbegin',`<div class="banner" style="margin:18px 0 10px"><div class="spread"><b>${R.ok?'Challenge complete!':'Challenge failed'}</b>${starsHTML(R.stars)}</div><div class="sub">${esc(R.text)}</div>
        <div class="row" style="margin-top:8px"><button class="btn pri sm" id="ch-again">Try again</button><button class="btn sm" id="ch-back">Back to your career</button></div></div>`);
      $('#ch-again').onclick=()=>{const d=S.sandbox.def;closeModal();leaveSandbox();startChallenge(d);};
      $('#ch-back').onclick=()=>{closeModal();leaveSandbox();go('play');};}
    $('#r-next').onclick=()=>{closeModal();const n=nextFixture();LM=null;if(n)startFixture(n.key);else go('home');};
    $('#r-card').onclick=()=>{closeModal();MATCH_TAB='card';go('match');};
  },50);
};

function init(){
  appInit();
  try{localStorage.removeItem(SANDBOX_KEY);}catch(e){}   // a challenge left mid-way doesn't come back
  setTimeout(applyBroadcast,0);
  if(loadSlot(SLOT)){LM=S.live||null;applyBroadcast();go('home');}
  else showSplash();
}
if(typeof window!=='undefined'&&!window.FXI_NO_INIT)init();
