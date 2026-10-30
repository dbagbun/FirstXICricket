// ═══ SCOUTING & CALL-UPS — uncapped prospects for the side you coach ═══
// S.scout = {team, year, pool:[pid], reports, known:{pid:1}}: each year (and each new job) brings SCOUT_POOL
// domestic prospects for your team (generated players, S.gen), SCOUT_REPORTS reports to reveal their true
// potential (until then you see a range), and you can call one up into your next squad. Generated players grow
// into their potential with age and, since this was added, with caps too (genRating: 15 caps = one step of youth).
const SCOUT_POOL=6,SCOUT_REPORTS=4;
function scoutState(){
  const C=S.coach;if(!C||!C.team)return null;
  const y=+careerDate().slice(0,4);
  if(!S.scout||S.scout.team!==C.team||S.scout.year!==y){
    genStore();
    const old=S.scout&&S.scout.team===C.team?S.scout:null,date=careerDate();
    const keep=old?old.pool.filter(p=>{const g=genP(p);return g&&!g.ret&&!capsOf(p)&&ageOf(g,date)<=27;}):[];
    const pool=keep.slice(0,SCOUT_POOL-2);
    while(pool.length<SCOUT_POOL)pool.push(newYoungster(C.team,y,true));
    S.scout={team:C.team,year:y,pool,reports:SCOUT_REPORTS,known:old?Object.fromEntries(Object.entries(old.known).filter(([p])=>pool.includes(+p))):{}};
  }
  return S.scout;
}
const starsOf=p=>6-genP(p).pot;   // 5 stars = potential rating 1
// What you know of his potential: the truth once scouted, otherwise a range two wide around a guess.
function potRange(p){
  const s=starsOf(p);if(S.scout&&S.scout.known[p])return[s,s];
  const off=(hstr('pot'+p)%3)-1,lo=clamp(s+off-1,1,5);return[lo,clamp(lo+2,1,5)];
}
function scoutReport(p){
  const X=scoutState();if(!X||X.reports<=0||X.known[p]||!X.pool.includes(+p))return false;
  X.reports--;X.known[p]=1;return true;
}
// Into the squad for your next series (a free place needed); he plays when the XI needs his role.
function callUp(p){
  const X=scoutState(),nx=coachNext();if(!X||!nx||!X.pool.includes(+p))return'none';
  const sq=squadFor(nx.sid,X.team,nx.date);if(sq.includes(+p))return'in';
  if(sq.length>=SQUAD_SIZE)return'full';
  sq.push(+p);genP(p).called=nx.date;
  coachNews(`${pName(p)} is called up for ${nx.title}.`,'good');
  if(typeof achieve==='function')achieve('callup');
  return'ok';
}
function prospectLine(p,date){
  const g=genP(p),a=pAttr(p,date),[lo,hi]=potRange(p);
  return{p,age:ageOf(g,date),role:g.role==='top'?'Top-order batter':g.role==='mid'?(g.st==='N'?'Middle-order batter':'All-rounder'):g.wk?'Keeper':'Bowler',
    style:a.style,rating:a.rating,bat:a.bat,lo,hi,known:!!(S.scout&&S.scout.known[p]),capped:capsOf(p)>0};
}
// ---------- the Coach screen's scouting card ----------
function scoutHTML(){
  const X=scoutState();if(!X)return'';
  const date=careerDate(),nx=coachNext(),sq=nx?squadFor(nx.sid,X.team,nx.date):[];
  const star=(lo,hi)=>lo===hi?'★'.repeat(lo):`${'★'.repeat(lo)}<span class="muted">${'☆'.repeat(hi-lo)}</span>`;
  return`<div class="card"><div class="spread"><h3 style="margin:0">Scouting - ${esc(teamName(X.team))} prospects</h3><span class="pill">${plural(X.reports,'report')} left in ${X.year}</span></div>
    <div class="muted" style="font-size:12px;margin:4px 0 8px">Uncapped players pushing for a place. Potential is a guess until you scout him; youngsters grow into it with age and with caps. Call one up into your next squad (it needs a free place).</div>
    <div class="tbl-wrap"><table><tr><th>Player</th><th class="hide-sm">Role</th><th>Now</th><th>Potential</th><th></th></tr>
    ${X.pool.map(p=>{const L=prospectLine(p,date),inSq=sq.includes(p);
      return`<tr><td>${plink(p)} <span class="muted" style="font-size:12px">${L.age}</span>${L.capped?' <span class="pill win">capped</span>':''}</td><td class="hide-sm muted" style="font-size:12px">${L.role}</td>
      <td style="font-size:12px">${batChip((L.bat||'G')[0])} ${L.style!=='N'?STYLE_NAME[L.style]+' r'+L.rating:''}</td><td class="gold" title="${L.known?'scouted':'a guess'}">${star(L.lo,L.hi)}</td>
      <td class="r"><span class="row" style="justify-content:flex-end">${L.known?'':`<button class="btn sm" data-scout="${p}" ${X.reports?'':'disabled'}>Scout</button>`}
      ${nx?(inSq?'<span class="pill">in the squad</span>':`<button class="btn sm pri" data-callup="${p}">Call up</button>`):''}</span></td></tr>`;}).join('')}</table></div></div>`;
}
function scoutWire(){
  $$('[data-scout]').forEach(b=>b.onclick=()=>{if(scoutReport(+b.dataset.scout)){const p=+b.dataset.scout;toast(`Scouting report: ${esc(pName(p))} - ${'★'.repeat(starsOf(p))} potential.`);saveGame();rerender();}});
  $$('[data-callup]').forEach(b=>b.onclick=()=>{const r=callUp(+b.dataset.callup);
    toast(r==='ok'?`${esc(pName(+b.dataset.callup))} is in the squad.`:r==='full'?`The squad is full (${SQUAD_SIZE}) - leave someone out first.`:'No series to call him up for.',r==='ok'?'ms':'warn');saveGame();rerender();});
}
