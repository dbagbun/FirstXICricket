// ═══ BE A PLAYER — one cricketer's career, from domestic hopeful to (maybe) the Hall of Fame ═══
// S.me = {pid, team, role, start, rep, status, intent:{bat, bowl}, dom:{m,inn,no,r,b,w,bb,br,hs}, xp, log:[], ret}
// Your player is a generated player (S.gen.players[pid], g.me) whose attributes come from meAttr: batting colour
// and bowling rating grow with experience (xp, from runs and wickets at any level) and fade from 33.
// Between your side's matches you play domestic cricket (domesticGame) that moves your selection standing (rep, 0-100);
// at 70+ you're picked, and international form keeps you in (below 35 you're dropped). When you're in the XI, your
// intent (defend / normal / attack) moves the cards one step for the overs you face and the overs you bowl.
const ME_ROLES={top:['Top-order batter','N','top'],ar:['All-rounder','M','mid'],pace:['Fast bowler','P','tail'],spin:['Spinner','S','tail'],wk:['Keeper-batter','N','top']};
const ME_PICK=70,ME_DROP=45;
// How a game went for your role, 0-100 (domestic or international): batters on runs, bowlers on wickets.
function mePerf(role,runs,wk,fmt,intl){
  const bat=clamp((intl?30:35)+runs*(intl?1:1.1),0,100),wpar=fmt==='TEST'?8:intl?15:18,bowl=clamp((intl?25:30)+wk*wpar,0,100);
  if(role==='pace'||role==='spin')return clamp(bowl+runs/5,0,100);
  if(role==='ar')return Math.max(bat,bowl)*.8+Math.min(bat,bowl)*.3;
  return bat;
}
// Selection standing is a moving average of those games (international ones weigh more).
const meStand=(M,perf,k)=>{M.rep=clamp(Math.round(M.rep*(1-k)+perf*k),0,100);};
function meP(){return S&&S.me&&!S.me.ret?S.me:null;}
const isMe=pid=>!!(S&&S.me&&S.me.pid===+pid);
function createMe({name,team,role,age}){
  genStore();
  const R=ME_ROLES[role]||ME_ROLES.top,year=+takeoverDate().slice(0,4),pid=S.gen.next++;
  S.gen.players[pid]={real:false,n:name,t:+team,born:year-clamp(+age||19,17,24),st:R[1],pot:3,wk:role==='wk',role:R[2],debut:null,me:true};
  S.me={pid,team:+team,role,start:takeoverDate(),rep:40,status:'domestic',intent:{bat:0,bowl:0},dom:{m:0,inn:0,no:0,r:0,b:0,w:0,bb:0,br:0,hs:0},xp:0,log:[]};
  S.settings.myTeam=+team;
  meLog(`${name} signs a domestic contract with ${teamName(team)}, aged ${clamp(+age||19,17,24)}.`);
  if(typeof achieve==='function')achieve('meStart');
  return pid;
}
function meLog(text,cls=''){const M=S.me;M.log.push({date:M.log.length?careerDate():M.start,text,cls});if(M.log.length>80)M.log.shift();}
// ---------- attributes ----------
// Batting: RED to start for bowlers, GREEN for batters; BLUE once the runs come (xp and an average).
// Bowling: rating 5 (part-time) to 1 (elite) by role and xp. Age takes a step off each from 34 and 37.
function meAttr(g,pid,date){
  const M=S.me,xp=M?M.xp:0,a=ageOf(g,date),fade=a>=37?2:a>=34?1:0,role=M?M.role:'top';
  const all=meAvg();
  let bat=role==='pace'||role==='spin'?(xp>=60&&all>=18?'G':'R'):(xp>=40&&all>=30?'B':'G');
  if(fade>=1&&bat==='B')bat='G';if(fade>=2&&bat==='G')bat='R';
  const base=role==='pace'||role==='spin'?4:role==='ar'?5:7;
  const steps=role==='pace'||role==='spin'?(xp>=300?3:xp>=150?2:xp>=50?1:0):role==='ar'?(xp>=200?2:xp>=80?1:0):0;
  const st=g.st,rating=st==='N'?7:clamp(base-steps+fade,1,6);
  return{style:st,rating,max:st==='N'?0:10,src:'g',bat,batSrc:'g',era:true};
}
// batting average over every level (domestic + international)
function meAvg(){
  const M=S.me;if(!M)return 0;let r=M.dom.r,inn=M.dom.inn,no=M.dom.no;
  for(const f of FORMATS){const s=S.stats[f][M.pid];if(s){r+=s.r;inn+=s.inn;no+=s.no;}}
  return inn-no>0?r/(inn-no):r;
}
// ---------- domestic cricket ----------
// A domestic game from your attributes: the colour sets the batting, the rating the bowling.
function domesticGame(date){
  const M=S.me,a=pAttr(M.pid,date),D=M.dom;
  const bm={B:44,G:32,R:12}[a.bat[0]]||24,bowls=a.style!=='N';   // domestic bowling is kinder than Test bowling
  const runs=Math.max(0,Math.round(-Math.log(1-rnd()*.98)*bm)),out=rnd()<.88,balls=Math.max(1,Math.round(runs*(rnd()*.5+.8)));
  let wk=0,br=0;
  if(bowls){const ex=[0,3,2.5,2,1.5,1,.5][a.rating]||.5;for(let i=0;i<5;i++)if(rnd()<ex/5)wk++;br=Math.round(30+rnd()*25+a.rating*3);}
  D.m++;D.inn++;if(!out)D.no++;D.r+=runs;D.b+=balls;D.hs=Math.max(D.hs,runs);if(bowls){D.w+=wk;D.bb+=48;D.br+=br;}
  meStand(M,mePerf(M.role,runs,wk,'ODI',false),.15);M.xp+=runs/20+wk*2.5;
  if(runs>=100)meLog(`A domestic hundred: ${runs}${out?'':'*'}.`,'good');else if(wk>=5)meLog(`Five wickets in a domestic game (${wk}/${br}).`,'good');
  return{runs,out,wk,br};
}
// ---------- selection ----------
// Called for each of your side's matches before it's built: domestic games in between, then the selectors.
function meBeforeMatch(fx){
  const M=meP();if(!M||![fx.a,fx.b].includes(M.team)||fx.friendly)return;
  if(M.lastFx===fx.key)return;M.lastFx=fx.key;
  if(M.status!=='xi'){const n=fx.fmt==='TEST'?2:1;for(let i=0;i<n;i++)domesticGame(fx.date);}
  const g=genP(M.pid),age=ageOf(g,fx.date);
  if(M.status!=='xi'&&M.rep>=ME_PICK){M.status='xi';meLog(`Picked for ${teamName(M.team)}: ${fx.title}.`,'good');}
  else if(M.status==='xi'&&M.rep<ME_DROP){M.status='dropped';meLog(`Dropped after ${fx.title?'a lean run':'poor form'} - back to domestic cricket.`,'bad');}
  if(age>=39&&!M.ret)meRetire('age');
}
// Put your player in his side's XI (from buildMatch's selectAndMods): he takes the place of the like-for-like man.
function meIntoXI(M){
  const me=meP();if(!me||me.status!=='xi'||!M.teams.includes(me.team)||!M.xi[me.team])return;
  const x=M.xi[me.team];if(x.bat.includes(me.pid)){M.meIn=true;return;}
  const date=M.date,role=me.role,bowler=p=>pAttr(p,date).style!=='N';
  let i;
  if(role==='wk')i=x.bat.indexOf(x.wk);
  else if(role==='top')i=[2,3,4,1,0,5].find(k=>!bowler(x.bat[k])&&x.bat[k]!==x.wk&&x.bat[k]!==x.cap);
  else if(role==='ar')i=[5,6,4].find(k=>x.bat[k]!==x.wk&&x.bat[k]!==x.cap);
  else{const bw=x.bat.map((p,k)=>[k,pAttr(p,date)]).filter(([k,a])=>k>=6&&a.style!=='N'&&x.bat[k]!==x.wk&&x.bat[k]!==x.cap);
    const same=bw.filter(([,a])=>(a.style==='S')===(role==='spin'));i=(same.length?same:bw).sort((a,b)=>b[1].rating-a[1].rating)[0]?.[0];}
  if(i==null||i<0)i=6;
  const out=x.bat[i];x.bat=x.bat.slice();x.bat[i]=me.pid;if(role==='wk'||out===x.wk)x.wk=me.pid;M.meIn=true;
  if(M.plans)delete M.plans[me.team];   // the real plan names a man who isn't playing
}
// After a match: international form moves your standing; xp grows; milestones and the log.
function meAfter(E){
  const M=meP();if(!M||!E.teams.includes(M.team))return null;
  const inXI=E.xi[M.team].slice(0,11).includes(M.pid);if(!inXI)return null;
  let runs=0,outs=0,wk=0,conc=0,balls=0;
  for(const I of E.inns){const b=I.bt.find(r=>r[0]===M.pid);if(b){runs+=b[1];if(b[5])outs++;}const w=I.bw.find(r=>r[0]===M.pid);if(w){wk+=w[4];conc+=w[3];balls+=w[1];}}
  const bowls=pAttr(M.pid,E.date).style!=='N';
  meStand(M,mePerf(M.role,runs,wk,E.fmt,true)+(E.result.winner===M.team?3:0),.2);M.xp+=runs/15+wk*3;
  const caps=capsOf(M.pid);
  if(caps===1){meLog(`International debut v ${teamName(otherOf(E,M.team))}: ${runs} runs${bowls?', '+wk+' wickets':''}.`,'good');achieve('meDebut');}
  if(runs>=100){meLog(`An international hundred: ${runs} v ${teamName(otherOf(E,M.team))}!`,'good');achieve('meTon');}
  if(wk>=5){meLog(`Five wickets v ${teamName(otherOf(E,M.team))}!`,'good');achieve('meFive');}
  if(E.motm===M.pid)meLog(`Man of the Match v ${teamName(otherOf(E,M.team))}.`,'good');
  if(caps===50)achieve('meFifty');
  return{runs,wk};
}
function meRetire(why){
  const M=S.me;if(!M||M.ret)return;M.ret=careerDate();M.status='retired';
  const g=genP(M.pid);g.ret=careerDate();
  meLog(why==='age'?'Retires from all cricket - time catches everyone.':'Announces his retirement.','');
}
// The card shift your intent adds for this over (from situationShift): batting while you're at the crease, bowling your overs.
function meShift(M,I,bowler){
  const me=meP();if(!me||!M.meIn)return 0;
  let s=0;
  if(I.bat===me.team&&(I.st===me.pid||I.ns===me.pid))s+=me.intent.bat||0;
  if(I.bowl===me.team&&bowler===me.pid)s+=me.intent.bowl||0;
  return s;
}
