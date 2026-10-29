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
<p><b>Tests</b> use their own card weights (RR_3 most overs, RR_7 as the wicket card), five days of 90 overs, weather, pitches that wear, follow-ons at 200 and declarations.</p>
<p><b>Your dice:</b> switch Settings → Dice to "I roll" and enter each roll yourself.</p>
<p><b>Captain:</b> Settings → Captaincy → Me, and you captain the team you follow (or both sides): choose who bowls each over (the real bowler of that over is marked),
who goes in next, and whether to attack or defend - attack moves the over one card faster, defend one slower. A batter sent up the order gains at most one colour.</p>
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
    <div class="spread"><span>Batting colours</span>${seg('batColours',[['player','Player'],['position','Classic (by position)']])}</div>
    <div class="spread"><span>Tournament knockouts</span>${seg('knockouts',[['timeline','My timeline'],['history','History']])}</div>
    ${HAS_REAL?`<div class="spread"><span>Real results (after you play a match)</span>${seg('history',[['after','Show'],['off','Hide']])}</div>`:''}
    <div class="spread"><span>Sound</span>${seg('sound',[['false','Off'],['true','On']])}</div>
    <div class="spread"><span>TV graphics for wickets &amp; milestones</span>${seg('tv',[['true','On'],['false','Off']])}</div>
    <div class="spread"><span>Watch speed</span>${seg('ballDelay',[[600,'Slow'],[250,'Normal'],[60,'Fast']])}</div>
    <div class="spread"><span>Follow a team</span><select id="st-team"><option value="0">None</option>${[...TEAMS.values()].map(t=>`<option value="${t.id}" ${st.myTeam===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>
    <button class="btn" id="st-guide">How to play</button></div>
  <div class="card stack"><h3>Save slots</h3>
    ${slots.map((d,i)=>`<div class="spread"><div><b>Slot ${i+1}</b>${i===SLOT?' <span class="pill win">active</span>':''}<br><span class="muted">${d?`${esc(d.name)} · ${d.matches.length} matches · ${fmtDate(d.matches.length?d.matches[d.matches.length-1].date:CAREER_START)}`:'empty'}</span></div>
      <div class="row">${d&&i!==SLOT?`<button class="btn sm" data-load="${i}">Load</button>`:''}${!d?`<button class="btn sm" data-new="${i}">New career</button>`:''}${d&&i!==SLOT?`<button class="btn sm warn" data-del="${i}">Delete</button>`:''}</div></div>`).join('')}
    <div class="row"><button class="btn" id="st-exp">Export career (JSON)</button><label class="btn">Import<input type="file" id="st-imp" accept=".json,application/json" hidden></label></div>
    <div class="row"><button class="btn" id="st-rebuild">Rebuild stats from scorecards</button><button class="btn warn" id="st-reset">Start this slot again</button></div></div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Data</h3><p class="sub">${FIX.length.toLocaleString()} ODI fixtures from Cricsheet (${fmtDate(FIX[0].date)} - ${fmtDate(FIX[FIX.length-1].date)}), ${Object.keys(WORLD.xi).length.toLocaleString()} real XIs and bowling plans, ${Object.keys(WORLD.players).length.toLocaleString()} players. Built from ${esc(WORLD.source||'the First XI workbook')}.</p></div>`;
  $$('[data-set]').forEach(b=>b.onclick=()=>{const k=b.dataset.set,v=b.dataset.val;st[k]=k==='ballDelay'?+v:v==='true'?true:v==='false'?false:v;
    if(S.live&&S.live.state!=='done'){if(k==='dice')S.live.manual=v==='manual';if(k==='captain')S.live.manualCaptain=v==='manual'?captainOf(S.live):null;if(k==='batColours')S.live.batMode=v;}
    saveGame();rerender();});
  $('#st-team').onchange=e=>{st.myTeam=+e.target.value;saveGame();};
  $('#st-guide').onclick=openGuide;
  $$('[data-load]').forEach(b=>b.onclick=()=>{saveGame();if(loadSlot(+b.dataset.load)){LM=null;toast('Loaded.');go('home');}});
  $$('[data-new]').forEach(b=>b.onclick=()=>{saveGame();setSlot(+b.dataset.new);S=null;LM=null;showSplash();});
  $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Delete this save for good?')){try{localStorage.removeItem(SLOT_KEYS[+b.dataset.del]);}catch(e){}rerender();}});
  $('#st-exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([exportCareer()],{type:'application/json'}));a.download='first-xi-career.json';a.click();};
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
      ${slots.some(Boolean)?`<h3 style="margin-top:10px">Or carry on</h3>${slots.map((d,i)=>d?`<div class="spread"><span>Slot ${i+1}: <b>${esc(d.name)}</b> <span class="muted">${d.matches.length} matches</span></span><button class="btn sm" data-sp="${i}">Load</button></div>`:'').join('')}`:''}
      <button class="btn" id="sp-guide">How it works</button></div></div>`;
  $('#sp-go').onclick=()=>{
    if(readSlot(SLOT)){const free=SLOT_KEYS.findIndex((_,i)=>!readSlot(i));if(free>=0)setSlot(free);else if(!confirm('All three slots are in use. Overwrite slot '+(SLOT+1)+'?'))return;}
    S=newCareer({name:$('#sp-name').value.trim()||'My career',myTeam:+$('#sp-team').value});saveGame();go('home');
  };
  $$('[data-sp]').forEach(b=>b.onclick=()=>{if(loadSlot(+b.dataset.sp))go('home');});
  $('#sp-guide').onclick=openGuide;
}

// live match events -> toasts; end of match -> result
uiMatchHook=(M,e,fast)=>{
  if(M.sim||VIEW!=='match')return;
  const shown=fxEvent(M,e);
  if(!shown&&['50','100','200','5w','hat','rain','followon'].includes(e.t))toast((e.t==='rain'?'🌧 ':e.t==='followon'?'':'🏏 ')+esc(evText(e)),e.t==='rain'?'warn':'ms');
  if(!shown&&e.t==='innsEnd'&&M.state==='live')toast(esc(evText(e)));
  if(fast)toast('🏆 '+esc(pName(fast.pid))+': '+esc(fast.text),'ms');
};
uiDoneHook=(M,E,ms,pos,aw)=>{
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
      ${aw&&aw.length?`<h3 style="margin-top:12px">Season review</h3><div class="stack">${honoursHTML(aw.map(a=>a.year))}</div>`:''}
      <div class="row" style="margin-top:14px"><button class="btn pri" id="r-next">Next fixture</button><button class="btn" id="r-card">Full scorecard</button></div>`);
    $('#r-next').onclick=()=>{closeModal();const n=nextFixture();LM=null;if(n)startFixture(n.key);else go('home');};
    $('#r-card').onclick=()=>{closeModal();MATCH_TAB='card';go('match');};
  },50);
};

function init(){
  if(loadSlot(SLOT)){LM=S.live||null;go('home');}
  else showSplash();
}
if(typeof window!=='undefined'&&!window.FXI_NO_INIT)init();
