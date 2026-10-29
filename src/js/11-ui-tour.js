// ═══ TOURNAMENT CENTRE ═══
const TOURNEYS=[...SERIES.values()].filter(s=>s.kind==='tournament');
function currentTourney(){
  const n=nextFixture();
  if(n&&n.fmt==='ODI'&&SERIES.get(n.sid).kind==='tournament')return n.sid;
  const last=[...S.matches].reverse().find(E=>E.sid&&SERIES.get(E.sid)?.kind==='tournament');
  return last?last.sid:TOURNEYS[0].sid;
}
function qualCount(E){
  if(E.hasSuper)return null;
  if(E.tri)return 2;
  const g=E.labels.length;
  if(E.K>=7&&g===2)return 4;
  if(E.K===3)return g===1?4:g===2?2:g===4?1:0;
  if(E.K===1)return g===1?2:1;
  return 0;
}
function tableHTML(rows,qual,label){
  return`<div><div class="sub" style="margin-bottom:4px">${esc(label)}</div><div class="tbl-wrap"><table class="num">
  <tr><th>#</th><th>Team</th><th class="r">P</th><th class="r">W</th><th class="r">L</th><th class="r">T/NR</th><th class="r">Pts</th><th class="r">NRR</th></tr>
  ${rows.map((r,i)=>`<tr class="${qual(r.team,i)?'q':''} ${r.team===S.settings.myTeam?'me':''}"><td class="muted">${i+1}</td><td>${tlabel(r.team)}</td><td class="r">${r.p}</td><td class="r">${r.w}</td><td class="r">${r.l}</td><td class="r">${r.t+r.nr}</td><td class="r"><b>${r.pts}</b></td><td class="r">${r.nrr>=0?'+':''}${r.nrr.toFixed(3)}</td></tr>`).join('')}
  </table></div></div>`;
}
RENDER.tour=(el,arg)=>{
  const sid=arg&&SERIES.has(arg)&&SERIES.get(arg).kind==='tournament'?arg:currentTourney();
  const E=edition(sid),R=editionResults(sid);
  const years=[...new Set(TOURNEYS.map(s=>s.start.slice(0,4)))];
  const nextIn=allFixtures().find(x=>x.sid===sid&&!S.done[x.key]&&x.playable);
  const stageNow=nextIn?(E.stageOf.get(nextIn.f.no)==='super'?superName(E):stageName(E.stageOf.get(nextIn.f.no),E)):R.size?'Complete':'Not started';
  const q=qualCount(E),sup=E.hasSuper?superTeams(E):null;
  const gt=groupTables(E);
  const groupsHTML=gt.map(t=>tableHTML(t.rows,(team,i)=>sup?sup.includes(team):q&&i<q&&t.rows[i].p>0,E.labels.length>1?'Group '+t.g:'Table')).join('');
  const superHTML=E.hasSuper?tableHTML(superTable(E),(team,i)=>i<4,superName(E)+' (points carried from games against fellow qualifiers)'):'';
  // bracket
  const cols=[];
  for(const f of E.ko){
    const st=E.stageOf.get(f.no),key='o'+f.no,done=S.done[key]&&S.matches.find(m=>m.id===S.done[key]);
    const k=done?{a:done.teams[0],b:done.teams[1]}:resolveKO(f);
    const lab=stageName(st,E);let c=cols.find(x=>x.lab===lab);if(!c)cols.push(c={lab,ms:[]});
    c.ms.push({f,k,done});
  }
  const br=cols.length?`<div class="bracket">${cols.map(c=>`<div class="col"><div class="sub">${esc(c.lab)}</div>${c.ms.map(m=>{
    const a=m.k?m.k.a:m.f.a,b=m.k?m.k.b:m.f.b,w=m.done&&m.done.result.winner;
    const sc=t=>m.done?m.done.inns.filter(I=>I.bat===t).map(I=>I.runs+(I.wkts<10?'/'+I.wkts:'')).join(''):'';
    return`<div class="m" ${m.done?`data-mid="${m.done.id}" style="cursor:pointer"`:''}>${[a,b].map(t=>`<div class="${w===t?'wn':''}"><span>${badge(t)} ${esc(teamShort(t))}</span><span class="num">${sc(t)}</span></div>`).join('')}
      <div class="muted" style="font-size:11px">${fmtDate(m.f.date)}${!m.k&&!m.done?' · history':''}</div></div>`;}).join('')}</div>`).join('')}</div>`:'';
  // leaders
  const bat={},bowl={};
  for(const M of R.values())for(const I of M.inns){for(const r of I.bt)bat[r[0]]=(bat[r[0]]||0)+r[1];for(const w of I.bw){const x=bowl[w[0]]=bowl[w[0]]||[0,0];x[0]+=w[4];x[1]+=w[3];}}
  const lb=Object.entries(bat).sort((a,b)=>b[1]-a[1]).slice(0,5),lw=Object.entries(bowl).sort((a,b)=>b[1][0]-a[1][0]||a[1][1]-b[1][1]).slice(0,5);
  el.innerHTML=`<div class="card"><div class="row"><select id="tc-sel">${years.map(y=>`<optgroup label="${y}">${TOURNEYS.filter(s=>s.start.startsWith(y)).map(s=>`<option value="${esc(s.sid)}" ${s.sid===sid?'selected':''}>${esc(s.title)}</option>`).join('')}</optgroup>`).join('')}</select>
    <span class="pill">${esc(stageNow)}</span><span class="muted">${fmtDate(E.s.start)} - ${fmtDate(E.s.end)} · ${E.s.teams.size} teams · ${E.fix.length} fixtures · ${R.size} played</span></div>
    <div class="muted" style="font-size:12px;margin-top:6px">Knockouts: ${S.settings.knockouts==='timeline'?'re-seeded from your tables once the league stage is complete':'follow history'} (Settings).</div></div>
  <div class="grid ${gt.length>1?'g2':''}" style="margin-top:14px">${groupsHTML}</div>
  ${superHTML?`<div class="card" style="margin-top:14px">${superHTML}</div>`:''}
  ${br?`<div class="card" style="margin-top:14px"><h3>Knockouts</h3>${br}</div>`:''}
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Leading run-scorers</h3>${lb.map(([p,r])=>`<div class="spread"><span>${plink(+p)}</span><b class="num">${r}</b></div>`).join('')||'<span class="muted">-</span>'}</div>
    <div class="card"><h3>Leading wicket-takers</h3>${lw.map(([p,x])=>`<div class="spread"><span>${plink(+p)}</span><b class="num">${x[0]} <span class="muted">(${x[1]} r)</span></b></div>`).join('')||'<span class="muted">-</span>'}</div></div>
  <div class="card" style="margin-top:14px"><h3>Results</h3>${[...R.values()].reverse().map(matchLine).join('<hr style="border:0;border-top:1px solid var(--line)">')||'<span class="muted">No matches played yet.</span>'}</div>`;
  $('#tc-sel').onchange=e=>go('tour',e.target.value);
};
