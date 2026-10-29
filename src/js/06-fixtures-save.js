// ═══ FIXTURES, TEST SERIES, MATCH PIPELINE & SAVES ═══
// Fixture keys: 'o<no>' for the real ODI calendar, 'T<n>.<k>' for Test series you schedule.
const CAREER_START=FIX[0].date;

// Venues: a ground's home side is the team that plays there most in bilateral series.
const VENUE_HOME=new Map(),HOME_VENUES=new Map();
(function(){
  const cnt=new Map();
  for(const f of FIX){if(!f.venue||seriesOf(f).kind!=='bilateral')continue;
    const m=cnt.get(f.venue)||new Map();for(const t of[f.a,f.b])m.set(t,(m.get(t)||0)+1);m.city=f.city;cnt.set(f.venue,m);}
  for(const[v,m]of cnt){
    let best=0,bn=0,tot=0;for(const[t,n]of m)if(typeof t==='number'){tot+=n;if(n>bn){bn=n;best=t;}}
    if(bn/tot>=.5&&tot>=3){VENUE_HOME.set(v,best);if(!HOME_VENUES.has(best))HOME_VENUES.set(best,[]);HOME_VENUES.get(best).push({venue:v,city:m.city,n:tot});}
  }
  for(const l of HOME_VENUES.values())l.sort((a,b)=>b.n-a.n);
})();
const TEST_TEAMS=WORLD.teams.filter(t=>t.full).map(t=>t.id);

// Series you schedule (S.tests, any format - the name is historical): {id, fmt, a (hosts), b, title, fix:[{key,date,venue,city}]}
const T20_START='2005-02-17',SERIES_GAP={TEST:10,ODI:3,T20:2},SERIES_SUFFIX={TEST:'Tests',ODI:'ODIs',T20:'T20Is'},MATCH_LABEL={TEST:'Test',ODI:'ODI',T20:'T20I'};
const ALL_TEAMS=WORLD.teams.filter(t=>TEAM_GAMES.has(t.id)).map(t=>t.id);
function testSeries(sid){
  const T=S&&S.tests.find(t=>t.id===sid);if(!T)return null;
  return{sid:T.id,name:T.title,title:T.title,teams:new Set([T.a,T.b]),fix:T.fix.map(x=>x.key),start:T.fix[0].date,end:T.fix[T.fix.length-1].date,kind:'bilateral',fmt:T.fmt||'TEST'};
}
function createSeries({fmt='TEST',a,b,n,start}){
  a=+a;b=+b;n=clamp(+n||3,1,fmt==='TEST'?5:7);
  if(fmt==='T20'&&start<T20_START)start=T20_START;
  const id='T'+(++S.testSeq),venues=(HOME_VENUES.get(a)||[{venue:teamName(a)+' Oval',city:''}]).slice(0,8);
  const yr=start.slice(0,4);
  const T={id,fmt,a,b,title:`${teamName(b)} tour of ${teamName(a)} ${yr} (${SERIES_SUFFIX[fmt]})`,fix:[]};
  for(let k=0;k<n;k++){const v=venues[k%venues.length];T.fix.push({key:id+'.'+(k+1),date:addDays(start,k*SERIES_GAP[fmt]),venue:v.venue,city:v.city});}
  S.tests.push(T);fxDirty();
  return T;
}
const createTestSeries=o=>createSeries({...o,fmt:'TEST'});
function customFx(T,x,k){const fmt=T.fmt||'TEST';return{key:x.key,fmt,date:x.date,a:T.a,b:T.b,venue:x.venue,city:x.city,sid:T.id,title:T.title,label:`${ordinal(k+1)} ${MATCH_LABEL[fmt]}`,playable:true,custom:true};}
function deleteTestSeries(id){
  const T=S.tests.find(t=>t.id===id);if(!T||T.fix.some(x=>S.done[x.key]))return false;
  S.tests=S.tests.filter(t=>t.id!==id);fxDirty();return true;
}
const ODI_FX=FIX.map(f=>({key:'o'+f.no,fmt:'ODI',date:f.date,a:f.a,b:f.b,venue:f.venue,city:f.city,sid:f.sid,f,
  title:seriesOf(f).title,label:f.mno?'Match '+f.mno:(f.raw&&f.raw!==f.name?f.raw:'ODI'),playable:!!(WORLD.xi[f.cid]&&WORLD.xi[f.cid][f.a]&&WORLD.xi[f.cid][f.b])}));
const REAL_TEST_FX=TFIX.map(f=>{const s=seriesOf(f),k=s.fix.indexOf(f.no)+1;
  return{key:'r'+f.no,fmt:'TEST',date:f.date,a:f.a,b:f.b,venue:f.venue,city:f.city,sid:f.sid,f,title:s.title,label:`${ordinal(k)} Test`,playable:true,real:true};});
const ODI_FX_BY_KEY=new Map([...ODI_FX,...REAL_TEST_FX].map(x=>[x.key,x]));
let FX_CACHE=null;
const fxDirty=()=>{FX_CACHE=null;};
function allFixtures(){
  if(FX_CACHE&&FX_CACHE.S===S)return FX_CACHE.list;
  const out=ODI_FX.concat(REAL_TEST_FX);
  for(const T of S.tests)T.fix.forEach((x,k)=>out.push(customFx(T,x,k)));
  for(const C of S.cups||[])for(const f of C.fix)out.push(cupFx(C,f));
  out.sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:(x.fmt==='TEST')-(y.fmt==='TEST'));
  FX_CACHE={S,list:out};
  return out;
}
function fixtureByKey(key){
  if(key[0]==='o'||key[0]==='r')return ODI_FX_BY_KEY.get(key)||null;
  for(const T of S.tests){const k=T.fix.findIndex(x=>x.key===key);if(k>=0)return customFx(T,T.fix[k],k);}
  if(key[0]==='C'){const C=cupById(key.split('.')[0]),f=C&&C.fix.find(x=>x.key===key);if(f)return cupFx(C,f);}
  return null;
}
function nextFixture(){return allFixtures().find(x=>x.playable&&!S.done[x.key])||null;}
function careerDate(){const last=S.matches[S.matches.length-1];return last?last.date:CAREER_START;}

// Build the match for a fixture (not tossed yet). ODI knockouts can be re-seeded from your tables.
function buildMatch(fx){
  if(fx.fmt!=='ODI'||fx.custom){
    const xi=t=>(fx.real&&testXI(fx.f.cid,t,fx.date))||nearestXI(t,fx.date);
    const home=fx.real?(VENUE_HOME.get(fx.venue)||fx.a):fx.a;
    const M=newMatch({fmt:fx.fmt,a:fx.a,b:fx.b,home,date:fx.date,venue:fx.venue,city:fx.city,sid:fx.sid,series:fx.title,stage:fx.stage||fx.label,
      xiA:fx.xiA||xi(fx.a),xiB:fx.xiB||xi(fx.b)});
    if(fx.superOver)M.superOverOn=true;
    selectAndMods(M,fx);
    M.key=fx.key;M.batMode=S.settings.batColours;return M;
  }
  const f=fx.f,E=edition(f.sid);
  let a=f.a,b=f.b,reseeded=false;
  const ko=resolveFixture(f);
  if(ko&&!(ko.a===f.a&&ko.b===f.b)&&!(ko.a===f.b&&ko.b===f.a)){a=ko.a;b=ko.b;reseeded=true;}
  const xiFor=t=>(t===f.a||t===f.b)?fixtureXI(f.cid,t):(nearestXI(t,f.date,{sid:f.sid})||nearestXI(t,f.date));
  const M=newMatch({fmt:'ODI',a,b,date:f.date,venue:f.venue,city:f.city,cid:f.cid,fid:f.no,sid:f.sid,series:seriesOf(f).title,
    stage:E?stageName(E.stageOf.get(f.no),E):'',xiA:xiFor(a),xiB:xiFor(b),home:VENUE_HOME.get(f.venue)||0});
  if(reseeded){M.reseeded={a:f.a,b:f.b};for(const t of M.teams)if(t!==f.a&&t!==f.b)delete M.plans[t];}
  M.key=fx.key;M.batMode=S.settings.batColours;
  selectAndMods(M,fx);
  return M;
}
// Your side picks from its squad (injuries, squad choices); then form & fatigue become the engine's mods.
function selectAndMods(M,fx){
  const my=managedTeam();
  if(my&&!fx.friendly&&M.teams.includes(my)&&M.xi[my]){const r=pickXI(fx,my,M.xi[my]);M.xi[my]=r.xi;M.selNotes=r.notes;}
  M.mods=matchMods(M);
}

// ---------- end of match ----------
let uiMatchHook=null,uiDoneHook=null;
function onMatchEvent(M,e){
  if(M.friendly){if(uiMatchHook)uiMatchHook(M,e,null);return;}
  const fast=M.sim?null:liveFastest(M,e);
  if(M.sim&&(e.t==='50'||e.t==='100'))liveFastest(M,e);
  if(uiMatchHook)uiMatchHook(M,e,fast);
}
function onMatchDone(M){
  if(M.friendly){   // friendlies don't touch the career: no archive, stats, rankings or milestones
    const E=archiveMatch(M);if(S.live&&S.live.id===M.id)S.live=null;
    if(M.h2h)achieve('h2h');if(M.manual)achieve('dice');saveGame();
    if(uiDoneHook)uiDoneHook(M,E,[],null,[],[]);return;
  }
  const E=archiveMatch(M);
  if(M.key)S.done[M.key]=E.id;
  if(M.reseeded)S.reseed[M.key]={a:M.teams[0],b:M.teams[1]};
  S.matches.push(E);
  if(S.cups&&S.cups.length)fxDirty();   // knockout slots in your tournaments may now resolve
  S.logs[E.id]=packBalls(M);
  const ids=Object.keys(S.logs);if(ids.length>LOG_KEEP)for(const id of ids.slice(0,ids.length-LOG_KEEP))delete S.logs[id];
  applyStats(E);
  applyRankings(E);
  updateForm(E);
  const cn=coachAfter(E);
  const ms=checkMilestones(E),pos=playerOfSeries(E.sid),aw=yearEnd(E);
  if(S.live&&S.live.id===M.id)S.live=null;
  achCheck(E,M);
  if(S.sandbox)challengeAfter(M,E);
  if(!M.sim)saveGame();
  if(uiDoneHook)uiDoneHook(M,E,ms,pos,aw,cn);
}
// Quick-sim a fixture with auto dice and AI captains.
function simFixture(fx){
  const M=buildMatch(fx);M.sim=true;
  doToss(M);simMatch(M);
  return M;
}

// ---------- saves ----------
const SLOT_KEYS=['fxi_save_1','fxi_save_2','fxi_save_3'];
let SLOT=0;
try{SLOT=+(localStorage.getItem('fxi_slot')||0)||0;}catch(e){}
function setSlot(i){SLOT=i;try{localStorage.setItem('fxi_slot',String(i));}catch(e){}}
function parseSave(raw){try{const d=JSON.parse(saveText(raw));return d&&d.v===1&&Array.isArray(d.matches)?d:null;}catch(e){return null;}}
function readSlot(i){try{return parseSave(localStorage.getItem(SLOT_KEYS[i]));}catch(e){return null;}}
function saveGame(){
  if(!S)return false;
  S.savedAt=Date.now();
  const write=()=>localStorage.setItem(S.sandbox?SANDBOX_KEY:SLOT_KEYS[SLOT],lzPack(JSON.stringify(S)));   // challenges never touch your slot
  if(typeof askPersist==='function')askPersist();
  if(typeof FILE_HANDLE!=='undefined'&&FILE_HANDLE&&!S.sandbox)writeSaveFile();
  try{write();return true;}
  catch(e){
    try{S.logs={};write();toast('Storage nearly full: old ball-by-ball logs were cleared.','warn');return true;}
    catch(e2){toast('Could not save - browser storage is full. Export your career from Settings.','bad');return false;}
  }
}
function loadSlot(i){
  const d=readSlot(i);if(!d)return false;
  setSlot(i);S=d;
  S.settings=Object.assign(newCareer().settings,S.settings||{});
  for(const k of['tests','ms','matches','cups'])S[k]=S[k]||[];
  for(const k of['logs','msKeys','attrEdits','seen','reseed','done'])S[k]=S[k]||{};
  for(const k of['stats','teams'])for(const f of FORMATS)S[k][f]=S[k][f]||{};
  for(const f of FORMATS)S.fast[f]=S.fast[f]||{f50:null,f100:null};
  if(S.rk)for(const k of['team','yr','bat','bowl'])for(const f of FORMATS)S.rk[k][f]=S.rk[k][f]||{};
  if(!S.rk)rebuildRankings();
  return true;
}
function exportCareer(){return JSON.stringify(S);}
function importCareer(text){const d=parseSave(text);if(!d)return false;S=d;saveGame();return true;}
