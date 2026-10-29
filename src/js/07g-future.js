// ═══ THE FUTURE — after the real calendar: ageing, retirements, new players, a generated calendar ═══
// S.gen = {on, years:{Y:true}, players:{pid:{n, t, born, st, pot, wk, role, real, ret, debut}}, next}
// Real players who were active at the end of the data join the pool with an estimated birth year (from their
// debut); everyone ages: generated players grow into their potential and fade from 33; real players decline from
// 34. Each new year retires the old, brings youngsters through and schedules tours and ICC events (S.tests/S.cups).
const LAST_REAL=[...FIX,...TFIX].reduce((m,f)=>f.date>m?f.date:m,'');
const GEN_ID0=900001;
const isFuture=date=>!!date&&date>addDays(LAST_REAL,20);
const genP=pid=>S&&S.gen&&S.gen.players[pid]||null;
const ageOf=(g,date)=>+date.slice(0,4)-g.born;
// rating for a generated player at a date: potential, minus youth and age
function genRating(g,date){const a=ageOf(g,date);return clamp(g.pot+(a<22?2:a<25?1:a<=31?0:a<=34?1:2),1,5);}
function capsOf(pid){let n=0;if(S)for(const f of FORMATS){const s=S.stats[f][pid];if(s)n+=s.m;}return n;}
function genColour(g,pid){
  if(g.role==='tail')return'R';if(g.role==='mid')return'G';
  const full=TEAMS.get(g.t)?.full,c=capsOf(pid);
  return full?(c>=20?'B':'G'):(c>=40?'B':'BG');
}
// pAttr for generated players, and ageing for real ones in the future (called from pAttr)
function futureAttr(pid,date,base){
  const g=genP(pid);if(!g)return base;
  if(!g.real){const st=g.st;return{style:st,rating:st==='N'?7:genRating(g,date),max:st==='N'?0:10,src:'g',bat:genColour(g,pid),batSrc:'g',era:true};}
  if(!isFuture(date))return base;
  const a=ageOf(g,date),dec=a>=37?2:a>=34?1:0;
  const out={...base};
  if(out.style!=='N')out.rating=clamp(out.rating+dec,1,5);
  if(a>=37&&out.bat==='B')out.bat='G';
  return out;
}
// ---------- names in a team's style ----------
const NAME_CACHE=new Map();
function namePool(team){
  if(NAME_CACHE.has(team))return NAME_CACHE.get(team);
  const names=squadAroundReal(team).map(pName),first=[],last=[];let init=0;
  for(const n of names){const t=n.split(' ');if(t.length<2)continue;if(/^[A-Z]{1,4}$/.test(t[0]))init++;else first.push(...t.slice(0,-1));last.push(t[t.length-1]);}
  const P={first:first.length?first:['Sam','Alex','Jordan'],last:last.length?last:['Smith','Khan','Perera'],init:names.length?init/names.length:.5};
  NAME_CACHE.set(team,P);return P;
}
function genName(team){
  const P=namePool(team),taken=new Set([...Object.values(WORLD.players).map(p=>p[0]),...Object.values(S.gen.players).map(g=>g.n)]);
  for(let i=0;i<40;i++){
    const ln=pick(P.last),n=rnd()<P.init?'ABCDEGHJKLMNPRSTW'[rndInt(0,16)]+(rnd()<.6?'ABCDEGHJKLMNPRSTW'[rndInt(0,16)]:'')+' '+ln:pick(P.first)+' '+ln;
    if(!taken.has(n))return n;
  }
  return'New Player '+S.gen.next;
}
function squadAroundReal(team){const L=TEAM_GAMES.get(+team)||[];const last=L.slice(-25);const s=new Set();for(const f of last)for(const p of fixtureXI(f.cid,team).bat)s.add(p);return[...s];}
// ---------- the pool ----------
function genStore(){if(!S.gen)S.gen={on:true,years:{},players:{},next:GEN_ID0};return S.gen;}
function initFuture(){
  if(S.gen&&S.gen.init)return;
  genStore();S.gen.init=true;
  const cut=addDays(LAST_REAL,-730);
  for(const[t,games]of TEAM_GAMES){
    if(COMPOSITE.has(t))continue;
    const pos={},wk=new Set();
    for(const f of games){if(f.date<cut)continue;const x=fixtureXI(f.cid,t);x.bat.forEach((p,i)=>(pos[p]=pos[p]||[]).push(i+1));wk.add(x.wk);}
    for(const p in pos){
      if(S.gen.players[p])continue;
      const P=WORLD.players[p],d=DEBUT.get(+p)||CAREER_START,ps=pos[p].sort((a,b)=>a-b),med=ps[ps.length>>1];
      const born=d<='2002-12-31'?2002-rndInt(25,31):+d.slice(0,4)-rndInt(20,24);
      S.gen.players[p]={real:true,n:P[0],t:+t,born,st:P[1],pot:P[2]>5?5:P[2],wk:wk.has(+p),role:med<=5?'top':med<=8?'mid':'tail',debut:d};
    }
  }
}
function newYoungster(team,year,domestic){
  const full=TEAMS.get(team)?.full,role=pick(['top','top','top','mid','mid','tail','tail','tail']);
  const st=role==='tail'?pick(['P','P','S','M']):role==='mid'?pick(['M','S','P','N']):(rnd()<.8?'N':pick(['S','M']));
  const r=rnd(),pot=full?(r<.08?1:r<.25?2:r<.6?3:r<.88?4:5):(r<.02?1:r<.1?2:r<.35?3:r<.7?4:5);
  const pid=S.gen.next++;
  S.gen.players[pid]={real:false,n:genName(team),t:team,born:year-(domestic?rndInt(20,31):rndInt(18,22)),st,pot:domestic?Math.max(pot,3):pot,wk:role!=='tail'&&rnd()<.12,role,debut:null,domestic:!!domestic};
  return pid;
}
const activePool=(team,date)=>Object.entries(S.gen.players).filter(([,g])=>g.t===team&&!(g.ret&&g.ret<=date)&&ageOf(g,date)>=17).map(([p])=>+p);
function yearTurnover(year){
  const date=year+'-01-01';
  for(const[p,g]of Object.entries(S.gen.players)){
    if(g.ret)continue;const a=ageOf(g,date);
    const pr=a>=40?.9:a>=37?.45:a>=35?.25:a>=33?.08:(g.real&&!capsOf(p)?.15:.01);
    if(rnd()<pr)g.ret=date;
  }
  for(const t of new Set(Object.values(S.gen.players).map(g=>g.t))){
    const n=activePool(t,date).length;
    for(let i=0;i<Math.max(2,26-n);i++)newYoungster(t,year);
  }
}
// The best XI from a pool: keeper, four bowlers, then the batters, in a batting order by role.
function genXI(team,date){
  const pool=activePool(team,date).filter(p=>!isInjured(p,date));if(pool.length<11)return null;
  const at=p=>pAttr(p,date),cap=p=>capsOf(p),g=p=>S.gen.players[p];
  const keeper=pool.filter(p=>g(p).wk).sort((a,b)=>cap(b)-cap(a))[0]??pool.filter(p=>g(p).role!=='tail').sort((a,b)=>cap(b)-cap(a))[0];
  const bowlers=pool.filter(p=>p!==keeper&&at(p).style!=='N').sort((a,b)=>at(a).rating-at(b).rating||cap(b)-cap(a));
  const chosen=new Set([keeper]),bw=[];
  if(bowlers.some(p=>at(p).style==='S'))bw.push(bowlers.find(p=>at(p).style==='S'));
  for(const p of bowlers){if(bw.length>=5)break;if(!bw.includes(p))bw.push(p);}
  bw.slice(0,5).forEach(p=>chosen.add(p));
  const bats=pool.filter(p=>!chosen.has(p)).sort((a,b)=>(g(a).role==='top'?0:g(a).role==='mid'?1:2)-(g(b).role==='top'?0:g(b).role==='mid'?1:2)||(at(a).bat==='B'?0:1)-(at(b).bat==='B'?0:1)||cap(b)-cap(a));
  for(const p of bats){if(chosen.size>=11)break;chosen.add(p);}
  const rank=p=>(g(p).role==='top'?0:g(p).role==='mid'?20:40)+(p===keeper?15:0)+(at(p).style!=='N'?8-at(p).rating:0)-Math.min(10,cap(p)/20);
  const bat=[...chosen].sort((a,b)=>rank(a)-rank(b));
  const capt=bat.slice().sort((a,b)=>cap(b)-cap(a))[0];
  return{bat,wk:keeper,cap:capt};
}
// ---------- the calendar ----------
const FUTURE_HOSTS=[3,4,1,5,9,6,8,7,11,10];
function rankedTeams(fmt,pool){const L=teamRanking(fmt).map(r=>r.team).filter(t=>pool.includes(t));return[...L,...pool.filter(t=>!L.includes(t))];}
function generateYear(year){
  initFuture();if(S.gen.years[year])return;
  S.gen.years[year]=true;
  if(year>+LAST_REAL.slice(0,4))yearTurnover(year);
  const start=year===+LAST_REAL.slice(0,4)?addDays(LAST_REAL,25):year+'-01-10';
  const full=TEST_TEAMS.slice(),assoc=[...new Set(Object.values(S.gen.players).map(g=>g.t))].filter(t=>!TEAMS.get(t)?.full&&!COMPOSITE.has(t));
  const busy={};const free=(t,a,b)=>!(busy[t]||[]).some(([x,y])=>!(b<x||a>y));
  const book=(ts,a,b)=>ts.forEach(t=>(busy[t]=busy[t]||[]).push([a,b]));
  // ICC events
  const k=year-2026;
  if(year%2===0){const host=FUTURE_HOSTS[k%FUTURE_HOSTS.length],pool=[host,...rankedTeams('T20',[...full,...assoc]).filter(t=>t!==host)].slice(0,16);
    const s=year+'-06-02';createCup({name:`ICC T20 World Cup ${year}`,fmt:'T20',format:'groups4',host,start:s,teams:pool,quiet:true});book(pool,s,year+'-07-10');}
  if(year%4===3){const host=FUTURE_HOSTS[(k+3)%FUTURE_HOSTS.length],pool=[host,...rankedTeams('ODI',[...full,...assoc]).filter(t=>t!==host)].slice(0,10);
    const s=year+'-10-05';createCup({name:`ICC Cricket World Cup ${year}`,fmt:'ODI',format:'rr',host,start:s,teams:pool,quiet:true});book(pool,s,year+'-11-30');}
  if(year%4===1){const host=FUTURE_HOSTS[(k+5)%FUTURE_HOSTS.length],pool=[host,...rankedTeams('ODI',full).filter(t=>t!==host)].slice(0,8);
    const s=year+'-02-18';createCup({name:`ICC Champions Trophy ${year}`,fmt:'ODI',format:'groups2',host,start:s,teams:pool,quiet:true});book(pool,s,year+'-03-12');}
  // associates' own event
  if(assoc.length>=4){const pool=rankedTeams('T20',assoc).slice(0,6),host=pool[0],s=year+'-04-08';
    if(pool.every(t=>free(t,s,addDays(s,20)))){createCup({name:`Associates Cup ${year}`,fmt:pool.length>=4?'T20':'ODI',format:'rr',host,start:s,teams:pool,quiet:true});book(pool,s,addDays(s,20));}}
  // tours: rotate host/visitor pairs between Test nations, about two home and two away each a year
  const pairs=[];for(const h of full)for(const v of full)if(h!==v)pairs.push([h,v]);
  const off=(k*17)%pairs.length,todo=[...pairs.slice(off),...pairs.slice(0,off)].slice(0,18);
  // an associate or two visit a Test nation
  if(assoc.length)for(let i=0;i<2;i++)todo.push([full[(k+i*3)%full.length],assoc[(k+i)%assoc.length]]);
  for(const[h,v]of todo){
    const both=TEAMS.get(h).full&&TEAMS.get(v).full;
    const tests=both?rndInt(2,3):0,odis=rndInt(3,5),t20=rndInt(2,3);
    const len=tests*10+odis*3+t20*2+6;
    let d=start;
    for(let tries=0;tries<40;tries++){const e=addDays(d,len);if(e.slice(0,4)!==String(year))break;if(free(h,d,e)&&free(v,d,e))break;d=addDays(d,9);}
    const e=addDays(d,len);if(e.slice(0,4)!==String(year)||!free(h,d,e)||!free(v,d,e))continue;
    book([h,v],d,e);
    let cur=d;
    if(tests){createSeries({fmt:'TEST',a:h,b:v,n:tests,start:cur});cur=addDays(cur,tests*10);}
    createSeries({fmt:'ODI',a:h,b:v,n:odis,start:cur});cur=addDays(cur,odis*3+2);
    createSeries({fmt:'T20',a:h,b:v,n:t20,start:cur});
  }
  fxDirty();
}
// The calendar runs dry -> schedule the next year (once you're within a few months of the end of the data).
function ensureFuture(){
  if(!S||S.sandbox||S.settings.future==='off')return false;
  const cd=careerDate();if(cd<addDays(LAST_REAL,-120))return false;
  if(allFixtures().some(x=>x.playable&&!S.done[x.key]))return false;
  initFuture();
  let y=Math.max(+LAST_REAL.slice(0,4),...Object.keys(S.gen.years).map(Number).map(v=>v+1));
  generateYear(y);return true;
}
