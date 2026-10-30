// ═══ MY PLAYER SCREEN, the intent panel in a match, and the new-career fields ═══
const INTENT=[[-1,'Defend'],[0,'Normal'],[1,'Attack']];
const meNext=()=>{const M=meP();return M?allFixtures().find(x=>x.playable&&!S.done[x.key]&&(x.a===M.team||x.b===M.team))||null:null;};
function meStatus(M){return M.ret?['retired','Retired']:M.status==='xi'?['win','In the XI']:M.status==='dropped'?['loss','Dropped']:['','Domestic cricket'];}
function intentSeg(key,M){return`<div class="seg">${INTENT.map(([v,n])=>`<button data-int="${key}" data-v="${v}" class="${(M.intent[key]||0)===v?'on':''}">${n}</button>`).join('')}</div>`;}
function intentWire(){$$('[data-int]').forEach(b=>b.onclick=()=>{S.me.intent[b.dataset.int]=+b.dataset.v;saveGame();rerender();});}
function meDevHint(M,a){
  const bowler=M.role==='pace'||M.role==='spin';
  if(bowler)return a.rating>1?`Wickets bring the next step: rating ${a.rating-1} at ${a.rating===4?50:a.rating===3?150:300} experience - you're on ${Math.round(M.xp)}.`:'An elite bowler.';
  if(a.bat==='G')return`BLUE (only BLUE wickets get you out) at 40 experience and a batting average of 30 - you're on ${Math.round(M.xp)} and ${f1(meAvg())}.`;
  return a.bat==='B'?'BLUE: only the best balls get you out.':'';
}
RENDER.me=(el)=>{
  const M=S.me;if(!M){el.innerHTML='<div class="card empty">Start a new career with "Be a player" to play one cricketer\'s career.</div>';return;}
  const g=genP(M.pid),date=careerDate(),a=pAttr(M.pid,date),[cls,status]=meStatus(M),nx=meP()&&meNext();
  const rows=FORMATS.map(f=>[f,S.stats[f][M.pid]]).filter(x=>x[1]),D=M.dom;
  el.innerHTML=`<div class="stack">
  <div class="card hi"><div class="spread"><div><div class="sub">My player</div><h2 style="margin:2px 0">${plink(M.pid)}</h2>
      <div class="row">${badge(M.team)} <span>${esc(ME_ROLES[M.role][0])}</span> <span class="muted">age ${ageOf(g,date)}</span> <span class="pill ${cls}">${status}</span></div></div>
    <div style="min-width:240px"><div class="spread"><span class="sub">Selection standing</span><b class="num">${M.rep}</b></div>
      <div class="bar" style="height:10px;position:relative"><i style="width:${M.rep}%;background:${M.rep>=ME_PICK?'var(--green)':M.rep>=ME_DROP?'var(--gold)':'var(--red)'}"></i></div>
      <div class="muted" style="font-size:12px;margin-top:4px">${ME_PICK}+ and the selectors pick you; under ${ME_DROP} in the side and you're dropped.</div></div></div></div>
  <div class="grid g2" style="align-items:start"><div class="stack">
    <div class="card"><h3>Your game</h3>
      <div class="spread"><span>Batting</span><span>${batChip(a.bat[0])} <span class="muted">${BAT_NAME[a.bat]}</span></span></div>
      <div class="spread"><span>Bowling</span><span>${a.style==='N'?'<span class="muted">does not bowl</span>':`${STYLE_NAME[a.style]}, rating <b>${a.rating}</b>`}</span></div>
      <div class="spread"><span>Experience</span><b class="num">${Math.round(M.xp)}</b></div>
      <div class="muted" style="font-size:12px;margin-top:6px">${esc(meDevHint(M,a))}</div></div>
    ${meP()?`<div class="card"><h3>Intent</h3>
      <div class="spread"><span>Batting</span>${intentSeg('bat',M)}</div>
      ${a.style!=='N'?`<div class="spread" style="margin-top:6px"><span>Bowling</span>${intentSeg('bowl',M)}</div>`:''}
      <div class="muted" style="font-size:12px;margin-top:6px">Attack deals your overs (batting or bowling) one card faster - more runs and more wickets; defend one slower. It lasts until you change it.</div></div>`:''}
    ${meP()?`<div class="card"><div class="spread"><div><div class="sub">${esc(teamName(M.team))}'s next match</div>${nx?`<b>${tlabel(nx.a)} v ${tlabel(nx.b)}</b><div class="muted">${esc(nx.title)} · ${fmtDate(nx.date)}</div>`:'<span class="muted">Nothing scheduled.</span>'}</div>
      ${nx?(nextFixture()&&nextFixture().key===nx.key?`<button class="btn pri" data-playkey="${nx.key}">Play</button>`:`<button class="btn pri" id="me-sim">Sim to it</button>`):''}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${M.status==='xi'?'You\'re in the XI.':'Domestic games are played between your side\'s matches - score runs and take wickets to force your way in.'}</div></div>`:''}
    <div class="card"><h3>Domestic</h3><table class="num"><tr><th>M</th><th>Runs</th><th>HS</th><th>Avg</th>${D.bb?'<th>Wkts</th><th>Avg</th>':''}</tr>
      <tr><td>${D.m}</td><td>${D.r}</td><td>${D.hs}</td><td>${f2(D.inn-D.no>0?D.r/(D.inn-D.no):0)}</td>${D.bb?`<td>${D.w}</td><td>${f2(D.w?D.br/D.w:0)}</td>`:''}</tr></table></div>
  </div><div class="stack">
    <div class="card"><h3>International career</h3>${rows.length?rows.map(([f,s])=>`<div class="spread"><span>${FMT_PLURAL[f]}</span><span class="num">${s.m} m · ${s.r} runs @ ${f2(batAvg(s))}${s.bw?` · ${s.bw} wkts @ ${f2(bowlAvg(s))}`:''} · HS ${s.hs}${s.hsNo?'*':''}</span></div>`).join(''):'<p class="muted">Uncapped - for now.</p>'}</div>
    <div class="card"><h3>Story so far</h3>${M.log.slice().reverse().slice(0,14).map(l=>`<div class="${l.cls==='good'?'green':l.cls==='bad'?'red':''}"><span class="muted">${fmtDate(l.date)}</span> ${esc(l.text)}</div>`).join('')}</div>
    ${meP()?`<button class="btn warn" id="me-retire">Retire</button>`:''}
  </div></div></div>`;
  intentWire();
  $$('[data-playkey]').forEach(b=>b.onclick=()=>startFixture(b.dataset.playkey));
  $('#me-sim')&&($('#me-sim').onclick=()=>{const n=meNext();const list=allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=n.date&&x.key!==n.key&&x.a!==M.team&&x.b!==M.team);
    if(!list.length){startFixture(n.key);return;}simMany(list,'to your next match');});
  $('#me-retire')&&($('#me-retire').onclick=()=>{if(confirm(`Retire ${pName(M.pid)}? The career goes on without him.`)){meRetire('choice');saveGame();rerender();}});
};
// On the dashboard: where you stand.
function meCardHTML(){
  const M=S.me;if(!M)return'';const[cls,status]=meStatus(M),last=M.log[M.log.length-1];
  return`<div class="card hi" style="margin-bottom:14px"><div class="spread"><div><span class="sub">My player</span> <b>${plink(M.pid)}</b> <span class="pill ${cls}">${status}</span>
    <div class="muted" style="font-size:12px;margin-top:4px">${last?esc(last.text):''}</div></div>
    <div class="row"><span class="num" title="Selection standing">${M.rep}</span><button class="btn pri" data-go="me">My player</button></div></div></div>`;
}
// In a live match: your figures and intent, under the controls.
function mePanelHTML(M){
  const me=meP();if(!me||!M.meIn||M.state!=='live')return'';
  const I=curInn(M),B=I.bt[me.pid],W=I.bw[me.pid];
  return`<div class="stack" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)"><h3 style="margin:0">You: ${esc(pName(me.pid))}</h3>
    <div class="row">${B?`<span>Batting <b>${B.r}</b> (${B.b})${B.out?' - out':''}</span>`:''}${W?`<span>Bowling <b>${W.w}-${W.r}</b> (${oversTxt(W.b)})</span>`:''}</div>
    <div class="row"><span class="sub">Batting intent</span>${intentSeg('bat',me)}${pAttr(me.pid,M.date).style!=='N'?`<span class="sub">Bowling intent</span>${intentSeg('bowl',me)}`:''}</div></div>`;
}
