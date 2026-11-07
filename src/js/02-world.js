// ═══ WORLD — teams, players, fixtures, XIs and bowling plans from data/world.json ═══
const TEAMS=new Map(WORLD.teams.map(t=>[t.id,t]));
const teamName=id=>TEAMS.get(+id)?.name||('Team '+id);
const teamShort=id=>TEAMS.get(+id)?.short||String(id);
const pName=pid=>{const p=WORLD.players[pid];if(p)return p[0];const g=typeof genP==='function'&&genP(pid);return g?g.n:'#'+pid;};

// Player attributes: WORLD.players[pid] = [name, style P/S/M/N, rating 1-5 (7 = does not bowl), max overs, src,
// batting colour: B/G/R against everyone, or two letters = against associates + against Test nations
// ('BG': BLUE v associates, GREEN v Test nations; '' = by position), batSrc].
// era: [[year, rating, colour], ...] - his rating and colour as of that year (see tools/extract.py).
// pAttr(pid, date): as of `date` (default: your career date), unless Settings -> Ratings is 'career'.
// Edits in S.attrEdits win (bowling fields and/or bat).
function eraEntry(p,date){
  const E=p[7];if(!E||!E.length||!date)return null;
  const y=+date.slice(0,4);let e=E[0];
  for(const x of E){if(x[0]<=y)e=x;else break;}
  return e;
}
function pAttr(pid,date){
  const hasS=typeof S!=='undefined'&&S;
  const e=hasS&&S.attrEdits&&S.attrEdits[pid];
  if(date===undefined&&hasS&&typeof careerDate==='function')date=careerDate();
  if(!WORLD.players[pid]&&hasS&&S.gen&&S.gen.players[pid]){const g=futureAttr(pid,date,null);
    if(e&&e.style)Object.assign(g,{style:e.style,rating:e.rating,max:e.max,src:'e'});if(e&&e.bat!==undefined)Object.assign(g,{bat:e.bat,batSrc:'e'});return g;}
  const p=WORLD.players[pid]||['?','N',7,0,'d','','d'];
  const era=(!hasS||S.settings.ratings!=='career')?eraEntry(p,date):null;
  const bw=e&&e.style?e:{style:p[1],rating:era&&p[1]!=='N'?era[1]:p[2],max:p[3]};
  const bat=e&&e.bat!==undefined?e.bat:(era?era[2]:(p[5]||''));
  const out={style:bw.style,rating:bw.rating,max:bw.max,src:e&&e.style?'e':p[4],bat,batSrc:e&&e.bat!==undefined?'e':(p[6]||'d'),era:!!era};
  return hasS&&S.gen&&date&&date>LAST_REAL&&!e?futureAttr(pid,date,out):out;   // real players age after the data ends
}
const STYLE_NAME={P:'Pace',S:'Spin',M:'Medium',N:'-'};
const BAT_NAME={B:'BLUE',G:'GREEN',R:'RED',BG:'BLUE (GREEN v Test nations)',GR:'GREEN (RED v Test nations)',BR:'BLUE (RED v Test nations)'};
const posColour=pos=>pos<=6?'B':pos<=9?'G':'R';

// Series names: "ICC World Cup (Match 12)" -> "ICC World Cup". The same name recurs across years
// (NatWest Series, ICC World Cup ...), so an edition is a run of same-name fixtures with gaps under 60 days.
function normSeries(s){return String(s||'').replace(/\s*\((Match|Game)\s+[^)]*\)\s*$/i,'').trim();}
const FIX=WORLD.fixtures.map(r=>({no:r[0],date:r[1],raw:r[2],a:r[3],b:r[4],venue:r[5],city:r[6],cid:r[7],name:normSeries(r[2]),
  mno:(/\((?:Match|Game)\s+(\d+)\)\s*$/i.exec(r[2])||[])[1]|0})).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:x.no-y.no);
const FIX_BY_NO=new Map(FIX.map(f=>[f.no,f]));
// Real Tests (optional, added by tools/cricsheet_tests.py): same shape as FIX, keyed 'r<no>'.
const TFIX=(WORLD.tests||[]).map(r=>({no:r[0],date:r[1],raw:r[2],a:r[3],b:r[4],venue:r[5],city:r[6],cid:r[7],name:normSeries(r[2]),mno:0,test:true}));
const TFIX_BY_NO=new Map(TFIX.map(f=>[f.no,f]));
// Real T20Is (optional, tools/cricsheet_tests.py --t20; the T20 World Cups themselves are staged as cups): keyed 'i<no>'.
// wc: a real T20 World Cup match (played only in years filled in from real results; otherwise the game stages its own cups).
const IFIX=(WORLD.t20s||[]).map(r=>({no:r[0],date:r[1],raw:r[2],a:r[3],b:r[4],venue:r[5],city:r[6],cid:r[7],name:normSeries(r[2]),mno:0,t20:true,wc:r[8]===1,stage:r[9]||''})).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:x.no-y.no);
const SERIES=new Map();
(function buildSeries(){
  const last={};
  for(const f of[...FIX,...TFIX,...IFIX]){
    const nm=f.name||(teamName(f.a)+' v '+teamName(f.b));
    const pre=f.test?'Test:':f.t20?'T20:':'',lk=pre+nm;
    let sid=last[lk];
    if(!sid||daysBetween(SERIES.get(sid).end,f.date)>60){
      sid=pre+nm+'|'+f.date.slice(0,7);
      SERIES.set(sid,{sid,name:nm,year:f.date.slice(0,4),fix:[],teams:new Set(),start:f.date,end:f.date,test:!!f.test,t20:!!f.t20});
      last[lk]=sid;
    }
    const s=SERIES.get(sid);s.fix.push(f.no);s.teams.add(f.a);s.teams.add(f.b);s.end=f.date;f.sid=sid;
  }
  for(const s of SERIES.values()){
    s.kind=s.teams.size>=3&&!s.test&&!s.t20?'tournament':'bilateral';   // (real T20I tri-series play as plain series)
    s.title=s.name+(s.name.includes(s.year)?'':' '+(s.start.slice(0,4)===s.end.slice(0,4)?s.year:s.year+'/'+s.end.slice(2,4)))+(s.test&&!/test/i.test(s.name)?' (Tests)':'')+(s.t20&&!/T20|Twenty20/i.test(s.name)?' (T20Is)':'');
  }
})();
const seriesOf=f=>SERIES.get(f.sid);

// XIs: WORLD.xi[cid][tid] = [11 player ids in batting order, wkIndex, captainIndex]
function fixtureXI(cid,tid){
  const x=WORLD.xi[cid]&&WORLD.xi[cid][tid];
  if(!x)return null;
  return{bat:x.slice(0,11),wk:x[x[11]]??x[0],cap:x[x[12]]??x[0]};
}
// Real Test and T20I XIs: Cricsheet names no captain, and a keeper only when he made a stumping (index -1 = unknown).
// The keeper is then the man in the XI who has kept most in real XIs; the captain the one who led the side most
// within two years of the date (ODI XIs carry both), then career captaincies, the nearest ODI XI, the most-capped.
const realXIRow=(cid,tid)=>(WORLD.txi&&WORLD.txi[cid]||WORLD.t20xi&&WORLD.t20xi[cid]||{})[tid]||null;
let ROLE_IDX=null;
function roleIdx(){
  if(ROLE_IDX)return ROLE_IDX;
  // the workbook falls back to the opener (index 0) when a match has no keeper/captain flag, so those count a quarter
  const kept=new Map(),led=new Map(),apps=new Map(),inc=(m,p,w=1)=>m.set(p,(m.get(p)||0)+w),wt=i=>i===0?.25:1;
  for(const f of FIX){const s=WORLD.xi[f.cid];if(!s)continue;
    for(const x of Object.values(s)){if(x[11]!=null&&x[x[11]]!=null)inc(kept,x[x[11]],wt(x[11]));
      if(x[12]!=null&&x[x[12]]!=null){const c=x[x[12]];if(!led.has(c))led.set(c,[]);led.get(c).push([f.date,wt(x[12])]);}
      x.slice(0,11).forEach(p=>inc(apps,p));}}
  for(const k of['txi','t20xi'])for(const sides of Object.values(WORLD[k]||{}))for(const x of Object.values(sides)){
    if(x[11]>=0)inc(kept,x[x[11]]);x.slice(0,11).forEach(p=>inc(apps,p));}
  return ROLE_IDX={kept,led,apps};
}
function pickKeeper(bat,near){
  const R=roleIdx(),k=p=>(R.kept.get(p)||0)+(near&&p===near.wk?.5:0);
  const best=bat.slice().sort((a,b)=>k(b)-k(a))[0];
  if(k(best)>=1)return best;
  // nobody has kept: a specialist batter from 7 up (never a front-line bowler)
  return[6,5,4,3,7,2].map(i=>bat[i]).find(p=>p!=null&&(WORLD.players[p]?.[1]||'N')==='N')??bat[6];
}
function pickCaptain(bat,date,near){
  const R=roleIdx(),sum=L=>L.reduce((a,[,w])=>a+w,0),led=p=>R.led.get(p)||[];
  const s=p=>sum(led(p).filter(([d])=>Math.abs(daysBetween(d,date))<=730))*1000+sum(led(p))*10+(near&&p===near.cap?5:0)+(R.apps.get(p)||0)/1000;
  return bat.slice().sort((a,b)=>s(b)-s(a))[0];
}
function testXI(cid,tid,date){
  const x=realXIRow(cid,tid);
  if(!x)return null;
  const bat=x.slice(0,11),near=nearestXI(tid,date);
  const wk=x[11]>=0?bat[x[11]]:pickKeeper(bat,near);
  const cap=x[12]>=0?bat[x[12]]:pickCaptain(bat,date,near);
  return{bat,wk,cap};
}
// Team appearances by date, for picking a squad on a date that has no real fixture (Tests, re-seeded knockouts).
const TEAM_GAMES=new Map();
for(const f of FIX)for(const t of[f.a,f.b])if(WORLD.xi[f.cid]&&WORLD.xi[f.cid][t]){
  if(!TEAM_GAMES.has(t))TEAM_GAMES.set(t,[]);TEAM_GAMES.get(t).push(f);
}
// First appearance in the data (debut, or the start of the data for players already playing in 2002).
const DEBUT=new Map();
for(const f of FIX)if(WORLD.xi[f.cid])for(const t in WORLD.xi[f.cid])for(const p of WORLD.xi[f.cid][t].slice(0,11))if(!DEBUT.has(p))DEBUT.set(p,f.date);
function nearestXI(tid,date,opts={}){
  if(typeof isFranchise==='function'&&isFranchise(tid))return leagueXI(+tid,date);   // (engine-only runs don't load the league)
  if(typeof S!=='undefined'&&S&&S.gen&&isFuture(date)){const x=genXI(+tid,date);if(x)return x;}
  const games=TEAM_GAMES.get(+tid)||[];
  let best=null,bd=1e9;
  for(const f of games){
    if(opts.sid&&f.sid!==opts.sid)continue;
    let d=Math.abs(daysBetween(f.date,date));
    if(f.date>date)d+=30;   // prefer the squad he had going into the date
    if(d<bd){bd=d;best=f;}
  }
  return best?fixtureXI(best.cid,tid):null;
}
// Players who turned out for a team within `days` of a date, most appearances first.
function squadAround(tid,date,days=400){
  if(typeof S!=='undefined'&&S&&S.gen&&isFuture(date))return activePool(+tid,date).sort((a,b)=>capsOf(b)-capsOf(a));
  const cnt=new Map();
  for(const f of TEAM_GAMES.get(+tid)||[]){
    if(Math.abs(daysBetween(f.date,date))>days)continue;
    for(const p of fixtureXI(f.cid,tid).bat)cnt.set(p,(cnt.get(p)||0)+1);
  }
  return[...cnt.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
}
function fixturePlan(cid,tid){
  const p=WORLD.plans[cid]&&WORLD.plans[cid][tid];
  return p?p.map:'';
}
function realFigures(cid,tid){const p=WORLD.plans[cid]&&WORLD.plans[cid][tid];return p?p.fig:[];}
