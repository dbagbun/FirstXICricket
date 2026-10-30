// ═══ ICC EVENTS — the real T20 World Cups, and the World Test Championship ═══
// The real ODI calendar already holds the 50-over World Cups and Champions Trophies, and the future (07g) makes
// its own events; T20Is aren't in the data, so the real T20 World Cups are added as cups (S.icc.made[year])
// with the real hosts and the teams in the game (Afghanistan and Uganda aren't). Settings -> T20 World Cups.
// WTC: every two years from August 2019 (WTC_CYCLES, then one every two years), every Test between the nine
// WTC nations counts - 12 points a win, 6 a tie, 4 a draw - ranked on the percentage of points available.
// When a cycle ends the top two meet in a one-off final in England (S.wtc[endYear] = {key, champ:[...]}).
const T20WC=[
  [2007,'2007-09-11',5,[5,1,11,4,3,12,9,6,7,8,10,15]],
  [2009,'2009-06-05',4,[4,1,11,3,13,14,9,6,5,15,7,8]],
  [2010,'2010-04-30',8,[8,1,11,4,3,13,9,6,5,7,10]],
  [2012,'2012-09-18',7,[7,1,11,4,3,13,9,6,5,8,10]],
  [2014,'2014-03-16',11,[11,1,4,3,9,6,5,7,8,10,23,13,14,20,17]],
  [2016,'2016-03-08',3,[3,1,11,4,9,6,5,7,8,10,23,13,14,21,15]],
  [2021,'2021-10-17',17,[17,1,11,4,3,9,6,5,7,8,13,14,18,21,22,15]],
  [2022,'2022-10-16',1,[1,11,4,3,9,6,5,7,8,10,13,14,18,15,17]],
  [2024,'2024-06-01',8,[8,19,1,11,4,3,9,6,5,7,13,14,18,15,21,20]],
];
function iccState(){if(!S.icc)S.icc={made:{}};return S.icc;}
// From nextFixture: add the T20 World Cups still ahead of your career date (never into a sandbox).
function ensureIcc(){
  if(!S||S.sandbox)return;
  const I=iccState(),now=careerDate();
  if(S.settings.t20wc!=='off')for(const[y,start,host,teams]of T20WC){
    if(I.made[y]&&I.made[y]!=='off')continue;I.made[y]=start>now?'yes':'past';
    if(start<=now)continue;
    const ok=teams.filter(t=>TEAMS.has(t)&&nearestXI(t,start));
    if(ok.length>=8)I.made[y]=createCup({name:`ICC T20 World Cup ${y}`,fmt:'T20',format:ok.length>=12?'groups4':'groups2',host,start,teams:ok,quiet:true}).id;
  }
  wtcTick(now);
}
// Settings -> off removes the T20 World Cups not yet started; on brings back those still ahead.
function iccToggle(on){
  const I=iccState();
  if(on){for(const y in I.made)if(I.made[y]==='off')delete I.made[y];ensureIcc();return;}
  for(const[y,id]of Object.entries(I.made)){const c=cupById(id);if(!c||c.fix.some(f=>S.done[f.key]))continue;S.cups=S.cups.filter(x=>x.id!==id);I.made[y]='off';}
  fxDirty();
}
// ---------- World Test Championship ----------
const WTC_TEAMS=[1,3,4,5,6,7,8,9,11];
const WTC_REAL=[[2021,'2019-08-01','2021-05-31','2021-06-18','The Rose Bowl','Southampton'],[2023,'2021-08-04','2023-05-31','2023-06-07','Kennington Oval','London'],
  [2025,'2023-06-16','2025-05-31','2025-06-11',"Lord's",'London']];
function wtcCycles(upto){
  const out=WTC_REAL.map(([y,from,to,final,venue,city])=>({y,from,to,final,venue,city}));
  for(let y=2027;y<=+upto.slice(0,4)+2;y+=2)out.push({y,from:(y-2)+'-06-15',to:y+'-05-31',final:y+'-06-10',venue:"Lord's",city:'London'});
  return out;
}
const isWtcFinal=E=>/World Test Championship Final/.test(E.series||'');
function wtcTable(c){
  const T={};for(const t of WTC_TEAMS)T[t]={team:t,p:0,w:0,l:0,d:0,t:0,pts:0};
  for(const E of S.matches){
    if(E.fmt!=='TEST'||E.date<c.from||E.date>c.to||isWtcFinal(E)||!E.teams.every(t=>T[t]))continue;
    for(const t of E.teams){const r=T[t],R=E.result;r.p++;
      if(R.type==='draw'){r.d++;r.pts+=4;}else if(R.type==='tie'){r.t++;r.pts+=6;}else if(R.winner===t){r.w++;r.pts+=12;}else r.l++;}
  }
  return Object.values(T).filter(r=>r.p).map(r=>({...r,pct:Math.round(1000*r.pts/(12*r.p))/10})).sort((a,b)=>b.pct-a.pct||b.w-a.w||b.p-a.p);
}
function wtcState(){if(!S.wtc)S.wtc={};return S.wtc;}
// A cycle is over: book its final (the top two, three Tests each at least); a final played: crown the winner (a draw shares it).
function wtcTick(now){
  const W=wtcState();
  for(const c of wtcCycles(now)){
    const X=W[c.y];
    if(X&&X.key&&!X.done&&S.done[X.key]){const E=S.matches.find(m=>m.id===S.done[X.key]);if(E){X.done=1;X.champ=E.result.winner?[E.result.winner]:[...E.teams];
      if(typeof achieve==='function'&&X.champ.includes(S.settings.myTeam))achieve('wtc');}}
    if(X||now<addDays(c.to,-150))continue;
    // over once the career passes its end, or nothing left to play before it
    if(now<c.to){const nx=allFixtures().find(x=>x.playable&&!S.done[x.key]);if(!nx||nx.date<=c.to)continue;}
    const L=wtcTable(c).filter(r=>r.p>=3);
    if(L.length<2){W[c.y]={none:1,table:wtcTable(c).slice(0,9)};continue;}
    const date=c.final>now?c.final:addDays(now,7),T=createSeries({fmt:'TEST',a:L[0].team,b:L[1].team,n:1,start:date});
    T.title=`ICC World Test Championship Final ${c.y}`;T.fix[0].venue=c.venue;T.fix[0].city=c.city;fxDirty();
    W[c.y]={key:T.fix[0].key,a:L[0].team,b:L[1].team,date,table:L.slice(0,9)};
  }
}
function wtcHTML(){
  const now=careerDate(),cyc=wtcCycles(now).filter(c=>c.from<=now).reverse(),W=wtcState();
  if(!cyc.length)return`<div class="empty">The World Test Championship starts in August 2019. Every Test between the nine full members after that counts: 12 points a win, 4 a draw, ranked on the percentage of points available; the top two meet in a final.</div>`;
  return cyc.map(c=>{const L=W[c.y]&&W[c.y].table&&now>c.to?W[c.y].table:wtcTable(c),X=W[c.y]||{};
    const head=X.champ?`🏆 <b>${X.champ.map(t=>esc(teamName(t))).join(' & ')}</b>${X.champ.length>1?' share the title (the final was drawn)':' win the final'}`
      :X.key?`Final: ${tlabel(X.a)} v ${tlabel(X.b)} at ${esc(c.venue)}, ${fmtDate(X.date)}`:X.none?'<span class="muted">Too few Tests in this cycle for a final.</span>':`<span class="muted">${fmtDate(c.from)} - ${fmtDate(c.to)} · final ${fmtDate(c.final)}</span>`;
    return`<div class="card" style="margin-bottom:12px"><div class="spread"><h3 style="margin:0">World Test Championship ${c.y-2}-${String(c.y).slice(2)}</h3></div><div style="margin:6px 0 10px">${head}</div>
      ${L.length?`<table class="num"><tr><th>#</th><th>Team</th><th class="r">P</th><th class="r hide-sm">W</th><th class="r hide-sm">L</th><th class="r hide-sm">D</th><th class="r">Pts</th><th class="r">%</th></tr>
      ${L.map((r,i)=>`<tr class="${r.team===S.settings.myTeam?'me':''}"><td class="muted">${i+1}</td><td>${tlabel(r.team)}</td><td class="r">${r.p}</td><td class="r hide-sm">${r.w}</td><td class="r hide-sm">${r.l}</td><td class="r hide-sm">${r.d}</td><td class="r">${r.pts}</td><td class="r"><b>${r.pct}</b></td></tr>`).join('')}</table>`
      :'<div class="muted">No WTC Tests yet - schedule some (Dashboard → Schedule a series).</div>'}</div>`;}).join('');
}
