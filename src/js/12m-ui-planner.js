// ═══ SEASON PLANNER SCREEN — the calendar, the workload grid, rest and rotation ═══
const fatCol=f=>f>=60?'var(--red)':f>=35?'var(--gold)':'var(--green)';
function calendarHTML(list,team){
  const by=new Map();
  for(const fx of list){const k=fx.sid||fx.key;if(!by.has(k))by.set(k,{fx,n:0,from:fx.date,to:fx.date});const s=by.get(k);s.n++;s.to=fx.date;}
  const months=new Map();
  for(const s of by.values()){const m=s.from.slice(0,7);if(!months.has(m))months.set(m,[]);months.get(m).push(s);}
  const obj=sid=>S.coach&&S.coach.objs.find(o=>o.sid===sid&&o.status==='open');
  return[...months.entries()].map(([m,ss])=>`<div class="cal-m"><div class="cal-h">${fmtDate(m+'-01').replace(/^\d+ /,'')}</div>
    ${ss.map(s=>{const opp=team?[...new Set(list.filter(x=>(x.sid||x.key)===(s.fx.sid||s.fx.key)).map(x=>x.a===team?x.b:x.a))]:[];const o=obj(s.fx.sid);
      return`<div class="cal-s"><span class="pill ${s.fx.fmt==='TEST'?'test':''}">${FMT_NAME[statFmtOf(s.fx)]||s.fx.fmt}</span> <b>${esc(s.fx.title)}</b>
      <div class="muted" style="font-size:12px">${fmtDate(s.from)}${s.to!==s.from?' - '+fmtDate(s.to):''} · ${plural(s.n,'match','matches')}${opp.length&&opp.length<=3?' v '+opp.map(t=>esc(teamShort(t))).join(', '):''}</div>
      ${o?`<div style="font-size:12px">🎯 ${esc(o.text)}</div>`:''}</div>`;}).join('')}</div>`).join('');
}
RENDER.plan=(el)=>{
  const team=managedTeam(),date=careerDate();
  if(!team){
    const list=allFixtures().filter(x=>x.playable&&!S.done[x.key]&&x.date<=addDays(date,180));
    el.innerHTML=`<div class="stack"><div class="card"><h2 style="margin:0">Season planner</h2><p class="sub">Coach a nation, or pick squads for the team you follow (Settings → Pick squads), to plan workloads and rest players. Here's the next six months.</p></div>
      <div class="card"><div class="cal">${calendarHTML(list,0)||'<span class="muted">Nothing scheduled.</span>'}</div></div></div>`;
    return;
  }
  const list=myUpcoming(team),rows=workloadPlan(team),nx=rows[0];
  const ids=[...new Set(rows.flatMap(R=>R.xi))];
  const sq=nx?squadFor(nx.fx.sid,team,nx.fx.date):[],pool=[...new Set([...ids,...sq])];
  const bowl=p=>pAttr(p,date).style!=='N';
  pool.sort((a,b)=>bowl(b)-bowl(a)||(rows[0]&&(rows[0].f[b]||0)-(rows[0].f[a]||0)));
  const cell=(R,p)=>{
    const rest=isRested(R.fx,p),inj=isInjured(p,R.fx.date),f=R.f[p];
    if(inj)return`<td class="c muted" title="injured">🩹</td>`;
    if(rest)return`<td class="c"><button class="btn sm wl rest" data-rest="${R.fx.key}:${p}" title="Rested - click to pick him again">R</button></td>`;
    if(f==null)return`<td class="c"><button class="btn sm wl" data-rest="${R.fx.key}:${p}" title="Not in the XI - click to rest him anyway" style="opacity:.35">·</button></td>`;
    return`<td class="c"><button class="btn sm wl" data-rest="${R.fx.key}:${p}" title="Projected fatigue ${f} (injury risk ${injRisk(p,R.fx.fmt,f,R.fx.date).toFixed(1)}%) - click to rest" style="color:${fatCol(f)}">${f}</button></td>`;
  };
  el.innerHTML=`<div class="stack">
    <div class="card"><div class="spread"><div><h2 style="margin:0">Season planner</h2><div class="sub">${tlabel(team)} · the next ${plural(list.length,'match','matches')} in twelve months</div></div>
      <div class="row"><button class="btn pri" id="pl-auto">Rest anyone at 60+</button><button class="btn" id="pl-clear">Clear all rests</button></div></div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">Fatigue 60+ costs a bowler a rating step and raises the injury risk (pace bowlers twice as much). Each cell is his projected fatigue going into that match - click to rest him for it; the squad fills the gap.</p></div>
    ${rows.length?`<div class="card"><h3>Workload - next ${rows.length} matches</h3><div class="tbl-wrap"><table class="num wl-grid">
      <tr><th>Player</th><th class="r hide-sm">90d M</th><th class="r hide-sm">30d ov</th>${rows.map(R=>`<th class="c" title="${esc(R.fx.title)}">${fmtDate(R.fx.date).replace(/ \d{4}$/,'')}<br><span class="muted">${esc(teamShort(R.fx.a===team?R.fx.b:R.fx.a))} ${R.fx.fmt==='TEST'?'T':R.fx.fmt==='T20'?'20':''}</span></th>`).join('')}</tr>
      ${pool.map(p=>{const L=recentLoad(p,date),a=pAttr(p,date);return`<tr><td>${plink(p)} <span class="muted" style="font-size:11px">${a.style==='N'?'bat':STYLE_NAME[a.style]}</span></td><td class="r hide-sm">${L.m}</td><td class="r hide-sm">${L.ov}</td>${rows.map(R=>cell(R,p)).join('')}</tr>`;}).join('')}
    </table></div></div>`:''}
    <div class="card"><h3>The year ahead</h3><div class="cal">${calendarHTML(list,team)||'<span class="muted">Nothing scheduled.</span>'}</div></div></div>`;
  $$('[data-rest]').forEach(b=>b.onclick=()=>{const[k,p]=b.dataset.rest.split(':');const on=toggleRest(k,+p);toast(`${esc(pName(+p))} ${on?'rested':'back in contention'}.`);saveGame();rerender();});
  $('#pl-auto').onclick=()=>{const n=autoRotate(team);toast(n?`Rested ${plural(n,'player')}.`:'Nobody is projected at 60+.');saveGame();rerender();};
  $('#pl-clear').onclick=()=>{for(const R of myUpcoming(team))if(S.rest)delete S.rest[R.key];saveGame();rerender();};
};
