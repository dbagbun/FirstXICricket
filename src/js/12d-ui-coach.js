// ═══ COACH & SQUAD SCREEN ═══
const formIcon=(pid,fmt,col)=>{const f=formLevel(pid,fmt,col);return(f.bat>0||f.bowl>0?'<span class="green" title="In form">▲</span>':'')+(f.bat<0||f.bowl<0?'<span class="red" title="Out of form">▼</span>':'');};
const fatigueTag=(pid,date)=>{const f=fatigueOf(pid,date);return f>=60?`<span class="pill loss" title="Tired: one rating weaker with the ball">tired ${f}</span>`:f>=35?`<span class="pill">${f}</span>`:'';};
function confBar(c){const col=c>=60?'var(--green)':c>=35?'var(--gold)':'var(--red)';return`<div class="bar" style="height:10px"><i style="width:${c}%;background:${col}"></i></div>`;}
function startCoach(team){
  achieve('coach1');
  S.coach=newCoach(team,takeoverDate());S.settings.myTeam=+team;S.settings.captain='manual';
  coachNews(`You are the new coach of ${teamName(team)}. Contract until ${fmtDate(S.coach.until)}.`,'good');
  const nx=coachNext();if(nx)ensureObjectives(nx);
  S.coach.year=+careerDate().slice(0,4);yearObjective(S.coach.year);
  saveGame();
}
function simToMyMatch(){
  const nx=coachNext();if(!nx){toast('No more matches for your side.');return;}
  const list=allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=nx.date&&x.key!==nx.key&&x.a!==S.coach.team&&x.b!==S.coach.team);
  if(!list.length){startFixture(nx.key);return;}
  simMany(list,'to your next match');
}
RENDER.coach=(el)=>{
  const C=S.coach,my=managedTeam();
  if(!C&&!my){
    el.innerHTML=`<div class="card stack" style="max-width:640px"><h2>Coach a nation</h2>
      <p class="sub">Take a job: the board sets you a target for every series and tournament, judges you on results, renews your contract or sacks you. You pick a 15-man squad for each series, watch fatigue and injuries, and captain the side.</p>
      <div class="row"><select id="co-team">${[...TEAMS.values()].filter(t=>TEAM_GAMES.has(t.id)&&!COMPOSITE.has(t.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
      <button class="btn pri" id="co-go">Take the job</button></div>
      <p class="muted" style="font-size:12px">Or just pick squads for the team you follow: Settings → Selection → Me.</p></div>`;
    $('#co-go').onclick=()=>{startCoach(+$('#co-team').value);rerender();};
    return;
  }
  const nx=C&&C.team?coachNext():my?allFixtures().find(x=>x.playable&&!S.done[x.key]&&(x.a===my||x.b===my)):null;
  const team=C?C.team:my;
  const job=C?(C.team?`<div class="card hi"><div class="spread"><div><div class="sub">Coach of</div><h2 style="margin:2px 0">${tlabel(C.team)}</h2>
      <div class="muted">Since ${fmtDate(C.start)} · contract until ${fmtDate(C.until)}</div></div>
      <div style="min-width:220px"><div class="spread"><span class="sub">Board confidence</span><b class="num">${Math.round(C.conf)}</b></div>${confBar(C.conf)}
      <div class="muted" style="font-size:12px;margin-top:4px">Below ${COACH_SACK} you're sacked; ${COACH_RENEW}+ when the contract ends and it's renewed.</div></div></div></div>`
    :`<div class="card hi"><h2>Out of work</h2><p class="sub">${C.offers.length?'Offers on the table - take one, or sim on and wait for others.':'No offers yet. Sim on: sides lose coaches all the time.'}</p></div>`):'';
  const offers=C&&C.offers.length?`<div class="card"><h3>Job offers</h3>${C.offers.map((o,i)=>`<div class="spread" style="margin-bottom:6px"><span>${tlabel(o.team)} <span class="muted">No.${teamRanking('ODI').findIndex(r=>r.team===o.team)+1||'-'} in the ODI rankings · offer open until ${fmtDate(o.expires)}</span></span>
      <span class="row"><button class="btn pri sm" data-take="${o.team}">Accept</button><button class="btn sm" data-decline="${i}">Decline</button></span></div>`).join('')}</div>`:'';
  const objs=C?C.objs.slice().reverse():[];
  const open=objs.filter(o=>o.status==='open'),past=objs.filter(o=>o.status!=='open').slice(0,12);
  const objHTML=C?`<div class="card"><h3>The board's targets</h3>${open.map(o=>`<div class="spread"><span>🎯 ${esc(o.text)} <span class="muted">${esc(o.title)}</span></span><span class="pill">open</span></div>`).join('')||'<p class="muted">None right now.</p>'}
    ${past.length?`<h3 style="margin-top:12px">Past targets</h3>${past.map(o=>`<div class="spread"><span>${esc(o.text)} <span class="muted">${esc(o.title)}${o.rec?` · W${o.rec.w} L${o.rec.l}`:''}</span></span><span class="pill ${o.status==='met'?'win':o.status==='failed'?'loss':''}">${o.status==='void'?'left':o.status}</span></div>`).join('')}`:''}</div>`:'';
  const next=nx?`<div class="card"><div class="spread"><div><div class="sub">Your next match</div><b>${tlabel(nx.a)} v ${tlabel(nx.b)}</b><div class="muted">${esc(nx.title)} · ${esc(nx.label)} · ${fmtDate(nx.date)}</div></div>
      <div class="row">${nextFixture()&&nextFixture().key===nx.key?`<button class="btn pri" data-playkey="${nx.key}">Play</button>`:`<button class="btn pri" id="co-sim">Sim to my next match</button>`}</div></div></div>`:'';
  // squad for the next series
  let squad='';
  if(nx&&team){
    const sq=squadFor(nx.sid,team,nx.date),pool=[...new Set([...sq,...squadAround(team,nx.date,500)])].slice(0,40);
    const fmt=nx.fmt;
    squad=`<div class="card"><div class="spread"><h3 style="margin:0">Squad - ${esc(nx.title)}</h3><b class="num ${sq.length>SQUAD_SIZE?'red':''}">${sq.length}/${SQUAD_SIZE}</b></div>
      <div class="muted" style="font-size:12px;margin:4px 0 8px">Your XI keeps the real XI where those men are in the squad and fit; gaps are filled from the squad like for like. ▲▼ form · tired bowlers lose a rating step.</div>
      <div class="tbl-wrap"><table><tr><th></th><th>Player</th><th class="hide-sm">Bowling</th><th>Bat</th><th class="r">${FMT_NAME[fmt]} M</th><th class="r hide-sm">Runs</th><th class="r hide-sm">Wkts</th><th>Status</th></tr>
      ${pool.map(p=>{const a=pAttr(p,nx.date,fmt),s=S.stats[fmt][p]||{},inj=isInjured(p,nx.date);
        return`<tr><td><input type="checkbox" data-sq="${p}" ${sq.includes(p)?'checked':''} ${inj?'disabled':''}></td><td>${plink(p)} ${formIcon(p,fmt,a.bat?.length===2?a.bat[0]:a.bat||'G')}</td>
        <td class="hide-sm muted" style="font-size:12px">${a.style==='N'?'-':STYLE_NAME[a.style]+' r'+Math.min(a.rating,5)}</td><td>${a.bat?batChip(a.bat[0]):''}</td>
        <td class="r num">${s.m||0}</td><td class="r num hide-sm">${s.r||0}</td><td class="r num hide-sm">${s.bw||0}</td>
        <td>${inj?`<span class="pill loss">injured to ${fmtDate(injuredUntil(p))}</span>`:fatigueTag(p,nx.date)}</td></tr>`;}).join('')}</table></div></div>`;
  }
  const injList=team&&S.inj?Object.entries(S.inj).filter(([p,x])=>x.until>careerDate()&&x.team===team):[];
  const news=C?`<div class="card"><h3>News</h3>${C.news.slice(-12).reverse().map(n=>`<div style="margin-bottom:4px" class="${n.cls==='good'?'green':n.cls==='bad'?'red':''}"><span class="muted">${fmtDate(n.date)}</span> ${esc(n.text)}</div>`).join('')}</div>`:'';
  const hist=C&&C.history.length?`<div class="card"><h3>Coaching career</h3><table class="num"><tr><th>Team</th><th>From</th><th>To</th><th class="r">P</th><th class="r">W</th><th class="r">L</th><th>Left</th></tr>
    ${C.history.map(h=>`<tr><td>${tlabel(h.team)}</td><td>${fmtDate(h.from)}</td><td>${fmtDate(h.to)}</td><td class="r">${h.p}</td><td class="r">${h.w}</td><td class="r">${h.l}</td><td>${esc(h.why)}</td></tr>`).join('')}</table></div>`:'';
  el.innerHTML=`<div class="stack">${job}${offers}${next}${pressRoomHTML()}
    <div class="grid g2" style="align-items:start"><div class="stack">${objHTML}${injList.length?`<div class="card"><h3>Injuries</h3>${injList.map(([p,x])=>`<div>🩹 ${plink(+p)} <span class="muted">${esc(x.what)}, back ${fmtDate(x.until)}</span></div>`).join('')}</div>`:''}${hist}</div>
    <div class="stack">${backPagesHTML(4)}${news}</div></div>${squad}${C&&C.team?scoutHTML():''}</div>`;
  pressWire();scoutWire();
  $$('[data-take]').forEach(b=>b.onclick=()=>{takeJob(+b.dataset.take);const nx2=coachNext();if(nx2)ensureObjectives(nx2);saveGame();rerender();});
  $$('[data-decline]').forEach(b=>b.onclick=()=>{C.offers.splice(+b.dataset.decline,1);saveGame();rerender();});
  $$('[data-playkey]').forEach(b=>b.onclick=()=>startFixture(b.dataset.playkey));
  $('#co-sim')&&($('#co-sim').onclick=simToMyMatch);
  $$('[data-sq]').forEach(b=>b.onchange=()=>{
    const sq=squadFor(nx.sid,team,nx.date),p=+b.dataset.sq;
    if(b.checked){if(sq.length>=SQUAD_SIZE){b.checked=false;toast(`A squad is ${SQUAD_SIZE} players - leave someone out first.`,'warn');return;}sq.push(p);}
    else{if(sq.length<=11){b.checked=true;toast('You need at least 11 fit players.','warn');return;}sq.splice(sq.indexOf(p),1);}
    saveGame();rerender();
  });
};
