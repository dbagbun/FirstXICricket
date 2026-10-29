// ═══ RANKINGS SCREEN — team & player rankings, honours board, players of the series ═══
let RK_F={fmt:'ODI',tab:'teams'};
function awardLine(A,k,unit){
  const x=A[k];if(!x)return'';
  return`${plink(x.pid)} <span class="muted">${unit?x.v+' '+unit:Math.round(x.v)+' pts'}</span>`;
}
function honoursHTML(years){
  return years.map(y=>{const A=S.rk.awards[y];return`<div class="card"><h3>${y}</h3><table>${AWARD_NAMES.filter(([k])=>A[k]).map(([k,n,u])=>`<tr><td class="sub">${n}</td><td>${awardLine(A,k,u)}</td></tr>`).join('')}
    ${A.team?`<tr><td class="sub">Team of the Year</td><td>${tlabel(A.team.team)} <span class="muted">${A.team.w} wins from ${A.team.p}</span></td></tr>`:''}</table></div>`;}).join('');
}
RENDER.rank=(el)=>{
  const R=R_(),f=RK_F.fmt;
  const tabs=[['teams','Teams'],['bat','Batting'],['bowl','Bowling'],['ar','All-rounders'],['honours','Honours'],['pos','Players of the series']];
  let body='';
  if(RK_F.tab==='teams'){
    const L=teamRanking(f);
    body=L.length?`<table class="num"><tr><th>#</th><th>Team</th><th class="r">Matches</th><th class="r">Rating</th><th class="r">This year</th></tr>
      ${L.map((r,i)=>`<tr class="${r.team===S.settings.myTeam?'me':''}"><td class="muted">${i+1}</td><td>${tlabel(r.team)}</td><td class="r">${r.p}</td><td class="r"><b>${r.pts}</b></td>
      <td class="r ${r.was==null?'muted':r.pts>r.was?'green':r.pts<r.was?'red':'muted'}">${r.was==null?'new':(r.pts>=r.was?'+':'')+(r.pts-r.was)}</td></tr>`).join('')}</table>`:'<div class="empty">Play some matches to see the rankings.</div>';
  }else if(['bat','bowl','ar'].includes(RK_F.tab)){
    const L=playerRanking(f,RK_F.tab);
    body=L.length?`<table class="num"><tr><th>#</th><th>Player</th><th class="r">Points</th></tr>${L.map((r,i)=>`<tr><td class="muted">${i+1}</td><td>${plink(r.pid)} <span class="muted" style="font-size:11px">${(S.stats[f][r.pid]?.teams||[]).map(teamShort).join('/')}</span></td><td class="r"><b>${r.v}</b></td></tr>`).join('')}</table>
      <div class="muted" style="font-size:12px;margin-top:8px">Form over recent matches, weighted by the strength of the opposition. Players need 5 matches and a game in the last ${Math.round(RANK_ACTIVE_DAYS/30)} months.</div>`:'<div class="empty">Nobody qualifies yet.</div>';
  }else if(RK_F.tab==='honours'){
    const ys=Object.keys(R.awards).sort().reverse();
    body=ys.length?`<div class="grid g2">${honoursHTML(ys)}</div>`:'<div class="empty">Awards are given when each year is over.</div>';
  }else{
    const L=Object.entries(R.pos).sort((a,b)=>b[1].date.localeCompare(a[1].date)).slice(0,60);
    body=L.length?`<table>${L.map(([sid,x])=>`<tr><td class="muted num" style="white-space:nowrap">${fmtDate(x.date)}</td><td>${esc(x.title)}</td><td>${badge(x.team)} ${plink(x.pid)}</td></tr>`).join('')}</table>`:'<div class="empty">Finish a series to crown its player.</div>';
  }
  el.innerHTML=`<div class="card"><div class="row">${['teams','bat','bowl','ar'].includes(RK_F.tab)?`<div class="seg">${FORMATS.map(x=>`<button data-rkf="${x}" class="${f===x?'on':''}">${FMT_PLURAL[x]}</button>`).join('')}</div>`:''}
    <div class="seg">${tabs.map(([k,n])=>`<button data-rkt="${k}" class="${RK_F.tab===k?'on':''}">${n}</button>`).join('')}</div></div></div>
    <div class="${RK_F.tab==='honours'?'':'card'}" style="margin-top:14px">${body}</div>`;
  $$('[data-rkf]').forEach(b=>b.onclick=()=>{RK_F.fmt=b.dataset.rkf;rerender();});
  $$('[data-rkt]').forEach(b=>b.onclick=()=>{RK_F.tab=b.dataset.rkt;rerender();});
};
// Rankings and honours for the player card
function playerHonours(pid){
  const R=R_(),out=[];
  for(const f of FORMATS)for(const k of['bat','bowl','ar']){const i=playerRanking(f,k,100).findIndex(x=>x.pid===pid);if(i>=0)out.push(`No.${i+1} ${f} ${k==='ar'?'all-rounder':k==='bat'?'batter':'bowler'}`);}
  const aw=[];for(const[y,A]of Object.entries(R.awards))for(const[k,n]of AWARD_NAMES)if(A[k]&&A[k].pid===pid)aw.push(`${n} ${y}`);
  const pos=Object.values(R.pos).filter(x=>x.pid===pid).map(x=>`Player of the series: ${x.title}`);
  return{ranks:out,awards:aw.concat(pos)};
}
