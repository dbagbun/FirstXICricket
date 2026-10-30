// ═══ RANKINGS SCREEN — team & player rankings, honours board, players of the series ═══
let RK_F={fmt:'ODI',tab:'teams'};
function awardLine(A,k,unit){
  const x=A[k];if(!x)return'';
  return`${plink(x.pid)} <span class="muted">${unit?x.v+' '+unit:Math.round(x.v)+' pts'}</span>`;
}
function honoursHTML(years){
  return years.map(y=>{const A=S.rk.awards[y];return`<div class="card"><div class="spread"><h3 style="margin:0">${y}</h3><button class="btn sm" data-simg="${y}">Save as image</button></div><table>${AWARD_NAMES.filter(([k])=>A[k]).map(([k,n,u])=>`<tr><td class="sub">${n}</td><td>${awardLine(A,k,u)}</td></tr>`).join('')}
    ${A.team?`<tr><td class="sub">Team of the Year</td><td>${tlabel(A.team.team)} <span class="muted">${A.team.w} wins from ${A.team.p}</span></td></tr>`:''}</table></div>`;}).join('');
}
RENDER.rank=(el)=>{
  const R=R_(),f=RK_F.fmt;
  const tabs=[['teams','Teams'],['bat','Batting'],['bowl','Bowling'],['ar','All-rounders'],['wtc','Test Championship'],['honours','Honours'],['legends','Legends'],['pos','Players of the series']];
  let body='';
  if(RK_F.tab==='teams'){
    const L=teamRanking(f);
    body=L.length?`<table class="num"><tr><th>#</th><th>Team</th><th class="r">Matches</th><th class="r">Rating</th><th class="r">This year</th></tr>
      ${L.map((r,i)=>`<tr class="${r.team===S.settings.myTeam?'me':''}"><td class="muted">${i+1}</td><td>${tlabel(r.team)}</td><td class="r">${r.p}</td><td class="r"><b>${r.pts}</b></td>
      <td class="r ${r.was==null?'muted':r.pts>r.was?'green':r.pts<r.was?'red':'muted'}">${r.was==null?'new':(r.pts>=r.was?'+':'')+(r.pts-r.was)}</td></tr>`).join('')}</table>`:'<div class="empty">Play some matches to see the rankings.</div>';
  }else if(RK_F.tab==='wtc'){body=wtcHTML();
  }else if(['bat','bowl','ar'].includes(RK_F.tab)){
    const L=playerRanking(f,RK_F.tab);
    body=L.length?`<table class="num"><tr><th>#</th><th>Player</th><th class="r">Points</th></tr>${L.map((r,i)=>`<tr><td class="muted">${i+1}</td><td>${plink(r.pid)} <span class="muted" style="font-size:11px">${(S.stats[f][r.pid]?.teams||[]).map(teamShort).join('/')}</span></td><td class="r"><b>${r.v}</b></td></tr>`).join('')}</table>
      <div class="muted" style="font-size:12px;margin-top:8px">Form over recent matches, weighted by the strength of the opposition. Players need 5 matches and a game in the last ${Math.round(RANK_ACTIVE_DAYS/30)} months.</div>`:'<div class="empty">Nobody qualifies yet.</div>';
  }else if(RK_F.tab==='honours'){
    const ys=Object.keys(R.awards).sort().reverse();
    body=ys.length?`<div class="grid g2">${honoursHTML(ys)}</div>`:'<div class="empty">Awards are given when each year is over.</div>';
  }else if(RK_F.tab==='legends')body=legendsHTML();
  else{
    const L=Object.entries(R.pos).sort((a,b)=>b[1].date.localeCompare(a[1].date)).slice(0,60);
    body=L.length?`<table>${L.map(([sid,x])=>`<tr><td class="muted num" style="white-space:nowrap">${fmtDate(x.date)}</td><td>${esc(x.title)}</td><td>${badge(x.team)} ${plink(x.pid)}</td></tr>`).join('')}</table>`:'<div class="empty">Finish a series to crown its player.</div>';
  }
  el.innerHTML=`<div class="card"><div class="row">${['teams','bat','bowl','ar'].includes(RK_F.tab)?`<div class="seg">${FORMATS.map(x=>`<button data-rkf="${x}" class="${f===x?'on':''}">${FMT_PLURAL[x]}</button>`).join('')}</div>`:''}
    <div class="seg">${tabs.map(([k,n])=>`<button data-rkt="${k}" class="${RK_F.tab===k?'on':''}">${n}</button>`).join('')}</div></div></div>
    <div class="${RK_F.tab==='honours'?'':'card'}" style="margin-top:14px">${body}</div>`;
  $$('[data-rkf]').forEach(b=>b.onclick=()=>{RK_F.fmt=b.dataset.rkf;rerender();});
  $$('[data-rkt]').forEach(b=>b.onclick=()=>{RK_F.tab=b.dataset.rkt;rerender();});
  $('#lg-team')&&($('#lg-team').onchange=e=>{RK_F.xiTeam=+e.target.value;rerender();});
  $$('[data-lgf]').forEach(b=>b.onclick=()=>{RK_F.xiFmt=b.dataset.lgf;rerender();});
};
function xiHTML(x,title){
  if(!x)return'';
  const row=(p,tag)=>`<div class="spread"><span>${plink(p)} ${tag?`<span class="muted" style="font-size:11px">${tag}</span>`:''}</span></div>`;
  return`<div class="card"><h3>${esc(title)}</h3>${x.batters.map(p=>row(p)).join('')}${x.keeper?row(x.keeper,'wk'):''}${x.bowlers.map(p=>row(p,'bowler')).join('')}</div>`;
}
function legendsHTML(){
  const H=hof(),ind=Object.entries(H.inducted).sort((a,b)=>b[1].year-a[1].year||b[1].pct-a[1].pct);
  const lastY=Object.keys(H.ballots).sort().pop(),ballot=lastY?H.ballots[lastY].slice(0,10):[];
  const decs=[...new Set(S.matches.map(E=>Math.floor(+E.date.slice(0,4)/10)*10))];
  const team=RK_F.xiTeam||S.settings.myTeam||4,fmt=RK_F.xiFmt||'ODI';
  return`<div class="grid g2" style="align-items:start">
    <div class="stack"><div class="card"><h3>Hall of Fame</h3>${ind.length?ind.map(([p,x])=>`<div class="spread"><span>🏛️ ${plink(+p)} <span class="muted" style="font-size:12px">${(careerOf(+p).teams.size?[...careerOf(+p).teams].map(teamShort).join('/'):'')}</span></span><span class="muted">${x.year} · ${x.pct}%</span></div>`).join(''):'<p class="muted">Nobody yet. Players are eligible two years after retiring; the vote is at the end of each year.</p>'}</div>
      ${ballot.length?`<div class="card"><h3>${lastY} ballot</h3>${ballot.map(([p,pct])=>`<div class="spread"><span>${plink(p)}</span><span class="${pct>=HOF_PCT?'green':'muted'} num">${pct}%</span></div>`).join('')}<div class="muted" style="font-size:12px;margin-top:6px">${HOF_PCT}% to get in · at most ${HOF_MAX} a year · ${HOF_YEARS} years on the ballot</div></div>`:''}
      <div class="card"><h3>Retirements</h3>${H.notes.slice(-12).reverse().map(n=>`<div style="margin-bottom:4px"><span class="muted">${fmtDate(n.date)}</span> ${esc(n.text)}</div>`).join('')||'<p class="muted">None yet.</p>'}</div></div>
    <div class="stack">
      <div class="card"><div class="row"><h3 style="margin:0">All-time XI</h3><select id="lg-team">${[...TEAMS.values()].filter(t=>TEAM_GAMES.has(t.id)).map(t=>`<option value="${t.id}" ${t.id===team?'selected':''}>${esc(t.name)}</option>`).join('')}</select>
        <div class="seg">${FORMATS.map(f=>`<button data-lgf="${f}" class="${f===fmt?'on':''}">${FMT_NAME[f]}</button>`).join('')}</div></div></div>
      ${xiHTML(allTimeXI(team,fmt),`${teamName(team)} - all-time ${FMT_NAME[fmt]} XI`)||'<div class="card muted">Not enough matches yet.</div>'}
      ${decs.reverse().map(d=>{const T=decadeTeams(d);return T[fmt]?xiHTML(T[fmt],`${FMT_NAME[fmt]} team of the ${d}s${+careerDate().slice(0,4)<d+10?' (so far)':''}`):'';}).join('')}
    </div></div>`;
}
// Rankings and honours for the player card
function playerHonours(pid){
  const R=R_(),out=[];
  for(const f of FORMATS)for(const k of['bat','bowl','ar']){const i=playerRanking(f,k,100).findIndex(x=>x.pid===pid);if(i>=0)out.push(`No.${i+1} ${f} ${k==='ar'?'all-rounder':k==='bat'?'batter':'bowler'}`);}
  const aw=[];for(const[y,A]of Object.entries(R.awards))for(const[k,n]of AWARD_NAMES)if(A[k]&&A[k].pid===pid)aw.push(`${n} ${y}`);
  const pos=Object.values(R.pos).filter(x=>x.pid===pid).map(x=>`Player of the series: ${x.title}`);
  return{ranks:out,awards:aw.concat(pos)};
}
