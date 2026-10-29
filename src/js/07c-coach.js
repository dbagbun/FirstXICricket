// ═══ COACH CAREER, SQUADS, FORM, FATIGUE & INJURIES ═══
// Form (every player): S.form[fmt][pid] = {bat:[last innings], bowl:[last performances]}, judged against his
// role so that as many players run hot as cold (thresholds ~10th/80-90th percentiles, tools/dev eval): a top-order
// BLUE batter averaging FORM_COLD or less over his last five plays GREEN; a GREEN batter averaging FORM_HOT or more
// plays BLUE; a bowler's rating moves a step at FORM_BOWL. The tail (RED) is never touched.
// Fatigue and injuries apply to the side you manage (coach mode or Settings -> Selection -> Me).
// The engine only sees M.mods {bat:{pid:+1|-1}, bowl:{pid:+1|-1}}, built by matchMods() in buildMatch.
const FORM_N=5,FORM_COLD={ODI:11,TEST:13,T20:7},FORM_HOT={ODI:16,TEST:20,T20:11},FORM_BOWL={cold:5,hot:46};
function formOf(pid,fmt){
  const F=S&&S.form&&S.form[fmt]&&S.form[fmt][pid];if(!F)return{bat:null,bowl:null};
  const avg=a=>a.length>=3?a.reduce((x,y)=>x+y,0)/a.length:null;
  return{bat:avg(F.bat),bowl:avg(F.bowl)};
}
// -1/0/+1 for display and for the engine, given the colour he'd bat with
function formLevel(pid,fmt,col){
  const f=formOf(pid,fmt),out={bat:0,bowl:0};
  if(f.bat!=null){if(col==='B'&&f.bat<=FORM_COLD[fmt])out.bat=-1;else if(col==='G'&&f.bat>=FORM_HOT[fmt])out.bat=1;}
  if(f.bowl!=null){if(f.bowl<=FORM_BOWL.cold)out.bowl=-1;else if(f.bowl>=FORM_BOWL.hot)out.bowl=1;}
  return out;
}
function updateForm(E){
  if(!S.form)S.form=perFmt(()=>({}));
  const F=S.form[E.fmt]=S.form[E.fmt]||{},base={ODI:4.8,TEST:3.2,T20:7.5}[E.fmt];
  if(S.gen)for(const t of E.teams)for(const p of E.xi[t].slice(0,11)){const g=S.gen.players[p];if(g&&!g.real&&!g.debut)g.debut=E.date;}
  const push=(pid,k,v)=>{const x=F[pid]=F[pid]||{bat:[],bowl:[]};x[k].push(Math.round(v));if(x[k].length>FORM_N)x[k].shift();};
  for(const I of E.inns){
    for(const r of I.bt)push(r[0],'bat',r[1]);
    for(const w of I.bw)if(w[1]>=12)push(w[0],'bowl',w[4]*22-(w[3]-w[1]/6*base)*.35);
  }
}
// ---------- fatigue & injuries (your side) ----------
function fatigueOf(pid,date){
  let ov=0,m=0;
  for(let i=S.matches.length-1;i>=0;i--){
    const E=S.matches[i],d=daysBetween(E.date,date);if(d>21)break;if(d<0)continue;
    if(!E.teams.some(t=>E.xi[t].slice(0,11).includes(pid)))continue;
    if(d<=10)m+=E.fmt==='TEST'?3:1;
    for(const I of E.inns){const w=I.bw.find(x=>x[0]===pid);if(w&&d<=14)ov+=w[1]/6;}
  }
  const st=pAttr(pid,date).style;
  return clamp(Math.round(ov*(st==='P'?1.3:st==='M'?1:.7)+m*5),0,100);   // 3 full ODI spells in a fortnight ~ 60
}
const injuredUntil=pid=>S.inj&&S.inj[pid]&&S.inj[pid].until;
const isInjured=(pid,date)=>{const u=injuredUntil(pid);return!!u&&u>date;};
const INJURIES=['hamstring','side strain','back spasms','broken finger','ankle','groin','shoulder','calf'];
function rollInjuries(E,team){
  if(!S.inj)S.inj={};
  const out=[];
  for(const pid of E.xi[team].slice(0,11)){
    const f=fatigueOf(pid,E.date),st=pAttr(pid,E.date).style;
    const p=(E.fmt==='TEST'?.006:.003)+f/100*.03*(st==='P'?2:1);
    if(rnd()<p){const days=rndInt(7,45);S.inj[pid]={until:addDays(E.date,days),what:pick(INJURIES),since:E.date,team};out.push({pid,days,what:S.inj[pid].what});}
  }
  return out;
}
// ---------- the engine's view: form and fatigue as rating / colour steps ----------
function matchMods(M){
  const mods={bat:{},bowl:{}},my=managedTeam();
  if(S.settings.form!=='off'&&M.batMode!=='position')for(const t of M.teams)M.xi[t].bat.forEach((pid,i)=>{
    const opp=otherTeam(M,t),own=pAttr(pid,M.date).bat;
    // an associate's GREEN against a Test nation is the opposition rule, not form: never lift it
    const col=own&&own.length===2&&TEAMS.get(opp)?.full?'X':batColour({batMode:M.batMode,date:M.date},pid,i+1,opp);
    const f=formLevel(pid,M.fmt,col);
    if(f.bat)mods.bat[pid]=f.bat;
    if(f.bowl)mods.bowl[pid]=-f.bowl;
  });
  if(my&&M.teams.includes(my))for(const pid of M.xi[my].bat)if(fatigueOf(pid,M.date)>=60)mods.bowl[pid]=(mods.bowl[pid]||0)+1;
  return mods;
}
// ---------- squads (your side) ----------
const SQUAD_SIZE=15;
function managedTeam(){return S.coach?S.coach.team:(S.settings.selection==='me'?S.settings.myTeam:0);}
function squadFor(sid,team,date){
  S.squads=S.squads||{};
  const k=sid+':'+team;
  if(!S.squads[k]){
    const real=allFixtures().filter(x=>x.sid===sid&&x.f&&WORLD.xi[x.f.cid]&&WORLD.xi[x.f.cid][team]).flatMap(x=>fixtureXI(x.f.cid,team).bat);
    const pool=[...new Set([...real,...squadAround(team,date,365)])];
    S.squads[k]=pool.filter(p=>!isInjured(p,date)).slice(0,SQUAD_SIZE);
  }
  return S.squads[k];
}
// Your XI: the real XI where those men are in the squad and fit, the gaps filled from the squad like for like.
function pickXI(fx,team,base){
  const squad=squadFor(fx.sid,team,fx.date),date=fx.date;
  const ok=p=>squad.includes(p)&&!isInjured(p,date);
  const bat=base.bat.slice(),used=new Set(bat.filter(ok));
  const notes=[];
  for(let i=0;i<11;i++){
    if(ok(bat[i]))continue;
    const out=bat[i],a=pAttr(out,date),keeper=out===base.wk;
    const cands=squad.filter(p=>!used.has(p)&&ok(p));
    const like=cands.filter(p=>keeper?true:(pAttr(p,date).style==='N')===(a.style==='N'));
    const inn=(like[0]??cands[0]);
    if(inn==null)continue;
    used.add(inn);bat[i]=inn;notes.push({out,inn,why:isInjured(out,date)?'injured':'not in your squad'});
  }
  const wk=bat.includes(base.wk)?base.wk:bat[6],cap=bat.includes(base.cap)?base.cap:bat[0];
  return{xi:{bat,wk,cap},notes};
}

// ---------- coach career ----------
const COACH_SACK=15,COACH_RENEW=50,CONTRACT_DAYS=730;
function newCoach(team,date){return{team:+team,start:date,until:addDays(date,CONTRACT_DAYS),conf:60,objs:[],history:[],offers:[],news:[]};}
function rankPtsOf(t,fmt='ODI'){const e=R_().team[fmt][t];return e==null?rankPts(eloStart(t)):rankPts(e);}
function stageRank(st){return{group:1,super:2,playoff:2,quarter:3,semi:4,final:5}[st]||(String(st).startsWith('final')?5:0);}
function coachNews(text,cls=''){S.coach.news.push({date:careerDate(),text,cls});if(S.coach.news.length>40)S.coach.news.shift();}
// Objectives for a series as soon as your next match belongs to it.
function ensureObjectives(fx){
  const C=S.coach;if(!C||!C.team||!fx||fx.friendly||!fx.sid||![fx.a,fx.b].includes(C.team)||C.objs.some(o=>o.sid===fx.sid))return;
  const all=allFixtures().filter(x=>x.sid===fx.sid&&x.playable),mine=all.filter(x=>x.a===C.team||x.b===C.team);
  const teams=[...new Set(all.flatMap(x=>[x.a,x.b]))],fmt=fx.fmt==='TEST'?'TEST':fx.fmt==='T20'?'T20':'ODI';
  let o;
  if(teams.length<=2){
    const opp=fx.a===C.team?fx.b:fx.a,d=rankPtsOf(C.team,fmt)-rankPtsOf(opp,fmt),n=mine.length;
    o=d>=12?{kind:'winSeries',text:n>1?`Win the series against ${teamName(opp)}`:`Beat ${teamName(opp)}`,w:1}
      :d>-12?{kind:'notLose',text:n>1?`Don't lose the series to ${teamName(opp)}`:`Don't lose to ${teamName(opp)}`,w:.8}
      :{kind:'winOne',text:`Win ${n>1?'at least one match':'the match'} against ${teamName(opp)}`,w:.6};
  }else{
    const order=teams.slice().sort((a,b)=>rankPtsOf(b,fmt)-rankPtsOf(a,fmt)),pos=order.indexOf(C.team)+1;
    const E=fx.f?edition(fx.sid):null,hasKO=E&&E.ko.length;
    if(hasKO&&pos<=2)o={kind:'reach',st:5,text:'Reach the final',w:1.2};
    else if(hasKO&&pos<=4)o={kind:'reach',st:E.ko.length>=3?4:E.hasSuper?2:5,text:E.ko.length>=3?'Reach the semi-finals':'Reach the final',w:1};
    else if(E&&E.hasSuper&&pos<=Math.ceil(teams.length/2))o={kind:'reach',st:2,text:`Reach the ${superName(E)}`,w:.9};
    else{const k=Math.max(1,Math.round(mine.length/3));o={kind:'winN',n:k,text:`Win at least ${k} ${k===1?'match':'matches'}`,w:.7};}
  }
  C.objs.push({...o,sid:fx.sid,title:fx.title,status:'open',created:fx.date});
  coachNews(`The board's target for ${fx.title}: ${o.text}.`);
}
function seriesRecord(sid,team){
  const M=S.matches.filter(E=>E.sid===sid&&E.teams.includes(team));
  let w=0,l=0,best=0;
  for(const E of M){if(E.result.winner===team)w++;else if(E.result.winner)l++;best=Math.max(best,stageRank(E.fid?edition(E.sid)?.stageOf.get(E.fid):''));}
  return{w,l,p:M.length,best};
}
function judgeObjectives(){
  const C=S.coach;if(!C)return[];
  const out=[];
  for(const o of C.objs){
    if(o.status!=='open'||!seriesDone(o.sid))continue;
    const r=seriesRecord(o.sid,C.team);
    const met=o.kind==='winSeries'?r.w>r.l:o.kind==='notLose'?r.w>=r.l:o.kind==='winOne'?r.w>=1:o.kind==='winN'?r.w>=o.n:o.kind==='reach'?r.best>=o.st:o.kind==='rank'?false:false;
    if(o.kind==='rank')continue;
    o.status=met?'met':'failed';o.rec=r;
    const d=Math.round((met?14:-16)*o.w);C.conf=clamp(C.conf+d,0,100);
    coachNews(`${o.title}: target ${met?'met':'missed'} (${o.text}). Board confidence ${d>0?'+':''}${d}.`,met?'good':'bad');
    out.push(o);
  }
  return out;
}
// Year-end rankings target.
function yearObjective(year){
  const C=S.coach;if(!C||!C.team||C.objs.some(o=>o.kind==='rank'&&o.year===year))return;
  const L=teamRanking('ODI');if(L.length<8)return;   // no table to judge by yet
  const pos=L.findIndex(r=>r.team===C.team)+1||L.length,n=Math.max(1,Math.min(pos+1,L.length));
  C.objs.push({kind:'rank',year,n,text:`Finish ${year} in the ODI top ${n}`,title:`${year} rankings`,status:'open',w:.8,created:year+'-01-01'});
}
function judgeYear(year){
  const C=S.coach;if(!C)return;
  for(const o of C.objs)if(o.kind==='rank'&&o.year===year&&o.status==='open'){
    const pos=teamRanking('ODI').findIndex(r=>r.team===C.team)+1,met=pos>0&&pos<=o.n;
    o.status=met?'met':'failed';const d=Math.round((met?12:-15)*o.w);C.conf=clamp(C.conf+d,0,100);
    coachNews(`${year}: finished No.${pos||'-'} in the ODI rankings - target ${met?'met':'missed'}.`,met?'good':'bad');
  }
}
function offersFor(kind){
  const C=S.coach,prev=C.team||C.history.at(-1)?.team,L=teamRanking('ODI').map(r=>r.team);
  const date=careerDate(),active=ALL_TEAMS.filter(t=>t!==prev&&!COMPOSITE.has(t)&&allFixtures().some(x=>(x.a===t||x.b===t)&&x.date>date&&x.date<addDays(date,365)));
  const ix=t=>{const i=L.indexOf(t);return i<0?99:i;},me=ix(prev);
  let pool=kind==='up'?active.filter(t=>ix(t)<me):kind==='any'?active.slice():active.filter(t=>ix(t)>=me-1);
  if(!pool.length&&kind!=='up')pool=active.slice();
  const picks=[];while(picks.length<(kind==='up'?1:3)&&pool.length){const t=pool.splice(Math.floor(rnd()*pool.length),1)[0];picks.push(t);}
  return picks.map(t=>({team:t,expires:addDays(date,kind==='up'?30:90),kind}));
}
function leaveJob(why){
  const C=S.coach;if(!C.team)return;
  const r=S.matches.filter(E=>E.date>=C.start&&E.teams.includes(C.team));
  C.history.push({team:C.team,from:C.start,to:careerDate(),p:r.length,w:r.filter(E=>E.result.winner===C.team).length,l:r.filter(E=>E.result.winner&&E.result.winner!==C.team).length,why});
  for(const o of C.objs)if(o.status==='open')o.status='void';
  C.team=0;S.settings.myTeam=0;
}
function takeJob(team){
  achieve('coach1');
  const C=S.coach;if(C.team)leaveJob('moved on');
  Object.assign(C,{team:+team,start:careerDate(),until:addDays(careerDate(),CONTRACT_DAYS),conf:C.history.length?55:60,offers:[],stop:null});
  S.settings.myTeam=+team;S.settings.captain='manual';
  coachNews(`You are the new coach of ${teamName(team)}.`,'good');
}
// After every match: confidence, targets, contract, the sack, offers. Returns news items for the UI.
function coachAfter(E){
  const C=S.coach;if(!C)return[];
  const n0=C.news.length,y=+E.date.slice(0,4);
  if(C.year!==y){if(C.year)judgeYear(C.year);C.year=y;yearObjective(y);}
  C.offers=C.offers.filter(o=>o.expires>E.date);
  if(C.team&&E.teams.includes(C.team)){
    const opp=otherOf(E,C.team),gap=rankPtsOf(C.team,E.fmt==='TEST'?'TEST':'ODI')-rankPtsOf(opp,E.fmt==='TEST'?'TEST':'ODI');
    if(E.result.winner===C.team)C.conf=clamp(C.conf+(gap<-15?4:2),0,100);
    else if(E.result.winner)C.conf=clamp(C.conf-(gap>15?4:2),0,100);
    C.conf=Math.round((C.conf+(55-C.conf)*.03)*10)/10;   // memories fade: drift back towards 55
    for(const i of rollInjuries(E,C.team))coachNews(`${pName(i.pid)} is injured (${i.what}) - out for about ${plural(Math.round(i.days/7)||1,'week')}.`,'bad');
  }
  judgeObjectives();
  if(C.team){
    if(C.conf<COACH_SACK){coachNews(`Sacked. The board has lost confidence in you as coach of ${teamName(C.team)}.`,'bad');leaveJob('sacked');C.offers=offersFor('down');C.stop='sacked';}
    else if(E.date>=C.until){
      if(C.conf>=COACH_RENEW){C.until=addDays(C.until,CONTRACT_DAYS);coachNews(`Contract renewed until ${fmtDate(C.until)}.`,'good');}
      else{coachNews('Your contract has not been renewed.','bad');leaveJob('contract not renewed');C.offers=offersFor('down');C.stop='contract';}
    }else if(C.conf>=82&&!C.offers.length&&rnd()<.04){C.offers=offersFor('up');if(C.offers.length){coachNews(`${teamName(C.offers[0].team)} want you as their coach.`,'good');C.stop='offer';}}
  }
  // out of work: someone always needs a coach eventually
  if(!C.team&&!C.offers.length&&rnd()<.08){C.offers=offersFor('any');if(C.offers.length){coachNews(`${C.offers.map(o=>teamName(o.team)).join(', ')} ${C.offers.length>1?'are':'is'} looking for a coach.`,'good');C.stop='offer';}}
  const nx=nextFixture();
  if(C.team&&nx)ensureObjectives(coachNext());
  return C.news.slice(n0);
}
function coachNext(){const C=S.coach;return C&&C.team?allFixtures().find(x=>x.playable&&!S.done[x.key]&&(x.a===C.team||x.b===C.team))||null:null;}
