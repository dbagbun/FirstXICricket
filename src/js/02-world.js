// ═══ WORLD — teams, players, fixtures, XIs and bowling plans from data/world.json ═══
const TEAMS=new Map(WORLD.teams.map(t=>[t.id,t]));
const teamName=id=>TEAMS.get(+id)?.name||('Team '+id);
const teamShort=id=>TEAMS.get(+id)?.short||String(id);
const pName=pid=>(WORLD.players[pid]||['#'+pid])[0];

// Bowling attributes: [style P/S/M/N, rating 1-5 (7 = does not bowl), max overs]. Edits in S.attrEdits win.
function pAttr(pid){
  const e=typeof S!=='undefined'&&S&&S.attrEdits&&S.attrEdits[pid];
  const p=WORLD.players[pid]||['?','N',7,0,'d'];
  const a=e||{style:p[1],rating:p[2],max:p[3]};
  return{style:a.style,rating:a.rating,max:a.max,src:e?'e':p[4]};
}
const STYLE_NAME={P:'Pace',S:'Spin',M:'Medium',N:'-'};

// Series names: "ICC World Cup (Match 12)" -> "ICC World Cup". The same name recurs across years
// (NatWest Series, ICC World Cup ...), so an edition is a run of same-name fixtures with gaps under 60 days.
function normSeries(s){return String(s||'').replace(/\s*\((Match|Game)\s+[^)]*\)\s*$/i,'').trim();}
const FIX=WORLD.fixtures.map(r=>({no:r[0],date:r[1],raw:r[2],a:r[3],b:r[4],venue:r[5],city:r[6],cid:r[7],name:normSeries(r[2]),
  mno:(/\((?:Match|Game)\s+(\d+)\)\s*$/i.exec(r[2])||[])[1]|0})).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:x.no-y.no);
const FIX_BY_NO=new Map(FIX.map(f=>[f.no,f]));
// Real Tests (optional, added by tools/cricsheet_tests.py): same shape as FIX, keyed 'r<no>'.
const TFIX=(WORLD.tests||[]).map(r=>({no:r[0],date:r[1],raw:r[2],a:r[3],b:r[4],venue:r[5],city:r[6],cid:r[7],name:normSeries(r[2]),mno:0,test:true}));
const TFIX_BY_NO=new Map(TFIX.map(f=>[f.no,f]));
const SERIES=new Map();
(function buildSeries(){
  const last={};
  for(const f of[...FIX,...TFIX]){
    const nm=f.name||(teamName(f.a)+' v '+teamName(f.b));
    const lk=(f.test?'T:':'')+nm;
    let sid=last[lk];
    if(!sid||daysBetween(SERIES.get(sid).end,f.date)>60){
      sid=(f.test?'Test:':'')+nm+'|'+f.date.slice(0,7);
      SERIES.set(sid,{sid,name:nm,year:f.date.slice(0,4),fix:[],teams:new Set(),start:f.date,end:f.date,test:!!f.test});
      last[lk]=sid;
    }
    const s=SERIES.get(sid);s.fix.push(f.no);s.teams.add(f.a);s.teams.add(f.b);s.end=f.date;f.sid=sid;
  }
  for(const s of SERIES.values()){
    s.kind=s.teams.size>=3&&!s.test?'tournament':'bilateral';
    s.title=s.name+(s.name.includes(s.year)?'':' '+(s.start.slice(0,4)===s.end.slice(0,4)?s.year:s.year+'/'+s.end.slice(2,4)))+(s.test&&!/test/i.test(s.name)?' (Tests)':'');
  }
})();
const seriesOf=f=>SERIES.get(f.sid);

// XIs: WORLD.xi[cid][tid] = [11 player ids in batting order, wkIndex, captainIndex]
function fixtureXI(cid,tid){
  const x=WORLD.xi[cid]&&WORLD.xi[cid][tid];
  if(!x)return null;
  return{bat:x.slice(0,11),wk:x[x[11]]??x[0],cap:x[x[12]]??x[0]};
}
// Real Test XIs: keeper/captain index -1 = unknown, taken from the nearest real ODI XI when he's playing.
function testXI(cid,tid,date){
  const x=WORLD.txi&&WORLD.txi[cid]&&WORLD.txi[cid][tid];
  if(!x)return null;
  const bat=x.slice(0,11),near=nearestXI(tid,date);
  const wk=x[11]>=0?bat[x[11]]:near&&bat.includes(near.wk)?near.wk:bat[6];
  const cap=x[12]>=0?bat[x[12]]:near&&bat.includes(near.cap)?near.cap:bat[0];
  return{bat,wk,cap};
}
// Team appearances by date, for picking a squad on a date that has no real fixture (Tests, re-seeded knockouts).
const TEAM_GAMES=new Map();
for(const f of FIX)for(const t of[f.a,f.b])if(WORLD.xi[f.cid]&&WORLD.xi[f.cid][t]){
  if(!TEAM_GAMES.has(t))TEAM_GAMES.set(t,[]);TEAM_GAMES.get(t).push(f);
}
function nearestXI(tid,date,opts={}){
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
