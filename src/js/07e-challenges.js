// ═══ CHALLENGES — start from a match situation (or a tournament) and beat it; played in a sandbox ═══
// A challenge runs in its own temporary career (S.sandbox), saved to SANDBOX_KEY, so your real career is
// untouched; CH.main holds the real career while it runs. Results (stars) and achievements are kept per device.
// def: {id, title, desc, kind:'chase'|'defend'|'survive'|'bowlout'|'cup', fmt, bat, bowl, date, target, need, balls,
//       wkts (down), overs (Tests: left), cup:{teams, format, host, fmt}, team (cup: who you are)}
const SANDBOX_KEY='fxi_challenge',CH_STARS_KEY='fxi_challenge_stars';
const CH={main:null};
const CHALLENGES=[
  {id:'lastover',title:'Last-over thriller',desc:'England need 12 off the final over with 8 down against Australia.',kind:'chase',fmt:'ODI',bat:4,bowl:1,date:'2005-06-19',target:241,need:12,balls:6,wkts:8},
  {id:'defend10',title:'Hold your nerve',desc:'Defend 10 off the last over: India bowl to Pakistan, who have 4 wickets left.',kind:'defend',fmt:'ODI',bat:6,bowl:3,date:'2004-03-13',target:291,need:10,balls:6,wkts:6},
  {id:'big435',title:'The great chase',desc:'South Africa need 435 to beat Australia. All 50 overs to come.',kind:'chase',fmt:'ODI',bat:5,bowl:1,date:'2006-03-12',target:435,need:435,balls:300,wkts:0},
  {id:'tail60',title:'Tail-end rescue',desc:'New Zealand are 8 down and need 60 off 10 overs against Sri Lanka.',kind:'chase',fmt:'ODI',bat:9,bowl:7,date:'2007-02-03',target:240,need:60,balls:60,wkts:8},
  {id:'ire328',title:'Shock the giants',desc:'Ireland chase 328 against England with 25 overs left - and 5 down already.',kind:'chase',fmt:'ODI',bat:13,bowl:4,date:'2011-03-02',target:328,need:180,balls:150,wkts:5},
  {id:'semi16',title:'Semi-final heartbreak?',desc:'South Africa need 16 off 2 overs with 2 wickets left in a World Cup semi-final.',kind:'chase',fmt:'ODI',bat:5,bowl:1,date:'2007-04-25',target:231,need:16,balls:12,wkts:8,stage:'Semi-final'},
  {id:'t20death',title:'Death-overs maths',desc:'India need 25 off the last 2 overs of a T20 against Pakistan.',kind:'chase',fmt:'T20',bat:3,bowl:6,date:'2007-09-24',target:158,need:25,balls:12,wkts:5},
  {id:'t20defend',title:'Squeeze them',desc:'Defend 18 off 2 overs in a T20: West Indies bowl to England.',kind:'defend',fmt:'T20',bat:4,bowl:8,date:'2010-05-13',target:166,need:18,balls:12,wkts:4},
  {id:'save',title:'Save the Test',desc:'Day 5 at Lord\'s: England, 4 down, must bat out 70 more overs against Australia.',kind:'survive',fmt:'TEST',bat:4,bowl:1,date:'2005-07-21',target:420,need:320,overs:70,wkts:4},
  {id:'bowlout',title:'Bowl them out',desc:'Australia need 7 more wickets in 50 overs on the last day to beat India.',kind:'bowlout',fmt:'TEST',bat:3,bowl:1,date:'2004-10-06',target:450,need:330,overs:50,wkts:3},
  {id:'kenya',title:'Kenya\'s World Cup',desc:'Take Kenya all the way: win a 14-team World Cup in South Africa.',kind:'cup',team:12,cup:{fmt:'ODI',format:'groups2',host:5,start:'2003-02-09',teams:[1,3,4,5,6,7,8,9,10,11,12,16,14,18]}},
  {id:'dutch',title:'Oranje glory',desc:'Win an eight-team T20 cup with the Netherlands.',kind:'cup',team:14,cup:{fmt:'T20',format:'rr',host:14,start:'2009-06-05',teams:[14,4,6,7,3,1,13,15]}},
];
const challengeById=id=>CHALLENGES.find(c=>c.id===id)||null;
// share codes: "FXI1." + base64 of the definition
function challengeCode(def){return'FXI1.'+btoa(unescape(encodeURIComponent(JSON.stringify(def))));}
function parseChallengeCode(code){
  try{const t=String(code).trim();if(!t.startsWith('FXI1.'))return null;const d=JSON.parse(decodeURIComponent(escape(atob(t.slice(5)))));
    if(!d||!['chase','defend','survive','bowlout','cup','dream'].includes(d.kind))return null;d.id=d.id||'code-'+Math.abs([...t].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7));return d;}catch(e){return null;}
}
function readStars(){try{return JSON.parse(localStorage.getItem(CH_STARS_KEY)||'{}');}catch(e){return{};}}
function writeStars(o){try{localStorage.setItem(CH_STARS_KEY,JSON.stringify(o));}catch(e){}}

// ---------- building a mid-match position ----------
// Fabricated innings keep the scorecard consistent: batters' runs + extras = total, bowlers' balls = legal balls.
function fakeBatting(I,order,n,runs,ballsTotal,outs){
  const w=order.slice(0,n).map((p,i)=>Math.max(1,10-i));const tw=sum(w)||1;let left=runs,bl=ballsTotal;
  order.slice(0,n).forEach((p,i)=>{
    const r=i===n-1?left:Math.round(runs*w[i]/tw);const b=i===n-1?bl:Math.max(r?Math.round(r*1.2):1,Math.round(ballsTotal*w[i]/tw));
    left-=r;bl-=b;const B=newBat(i);B.r=Math.max(0,r);B.b=Math.max(0,b);B.f4=Math.floor(B.r/12);B.f6=Math.floor(B.r/40);
    if(i<outs)B.out={how:pick(['b','ct','ctof','lbw','ctwk']),bowler:0,fielder:0};
    I.bt[p]=B;
  });
}
function fakeBowling(M,I,overs,runs,wkts){
  const B=I.eng.B.slice().sort((a,b)=>a.rating-b.rating).slice(0,5);let ov=overs,r=runs,w=wkts;
  B.forEach((b,i)=>{
    const o=i===B.length-1?ov:Math.min(b.max===999?Math.ceil(overs/5)+2:b.max,Math.round(overs/B.length));
    const rr=i===B.length-1?r:Math.round(runs*o/Math.max(1,overs)),ww=i===B.length-1?w:Math.min(w,Math.round(wkts*o/Math.max(1,overs)));
    ov-=o;r-=rr;w-=ww;b.used=o;
    I.bw[b.pid]={b:o*6,r:Math.max(0,rr),w:Math.max(0,ww),md:0,wd:0,nb:0};I.bwOrder.push(b.pid);
  });
  // credit dismissals to bowlers who have wickets
  const wb=I.bwOrder.flatMap(p=>Array(I.bw[p].w).fill(p));
  Object.values(I.bt).filter(x=>x.out).forEach((x,k)=>{x.out.bowler=wb[k]||I.bwOrder[0];if(/ct|st/.test(x.out.how))x.out.fielder=pick(M.xi[I.bowl].bat);});
}
function fakeInnings(M,I,runs,wkts,balls,closed,why){
  const ex=Math.min(runs,Math.round(balls/40));
  const bats=Math.min(11,wkts+2);
  fakeBatting(I,I.order,closed&&wkts>=10?11:bats,runs-ex,Math.round(balls*1.03),wkts);
  I.ex.lb=ex;I.runs=runs;I.wkts=wkts;I.lb=balls;
  fakeBowling(M,I,Math.floor(balls/6),runs-ex,Object.values(I.bt).filter(b=>b.out).length);
  if(!closed){
    I.st=I.order[wkts];I.ns=I.order[wkts+1];
    for(const p of[I.st,I.ns])if(I.bt[p])I.bt[p].out=null;else I.bt[p]=newBat(I.order.indexOf(p));
    I.part={a:I.st,b:I.ns,r:0,bl:0,ra:0,rb:0,w:wkts+1};
    // the batters at the crease are the last two in, not out
    let outs=0;for(const p of I.order.slice(0,wkts+2)){const B=I.bt[p];if(B&&p!==I.st&&p!==I.ns&&!B.out)B.out={how:'b',bowler:I.bwOrder[0],fielder:0};if(B&&B.out)outs++;}
    I.fow=I.order.slice(0,wkts).filter(p=>p!==I.st&&p!==I.ns).map((p,k)=>({w:k+1,r:Math.round(runs*(k+1)/(wkts+1)),pid:p,ov:'-'}));
  }else{I.closed=true;I.why=why;I.fow=[];}
}
function buildChallengeMatch(def){
  const fmt=def.fmt,date=def.date,home=def.bowl;
  const rf=def.cid&&FIX.find(f=>f.cid===def.cid),v=rf?{venue:rf.venue,city:rf.city}:(HOME_VENUES.get(home)||[{venue:teamName(home)+' Oval',city:''}])[0];
  const xi=t=>(def.cid&&fixtureXI(def.cid,t))||nearestXI(t,date);
  const M=newMatch({fmt,a:def.bowl,b:def.bat,date,venue:v.venue,city:v.city,series:(def.real?'Relive: ':'Challenge: ')+def.title,stage:def.stage||'',
    xiA:xi(def.bowl),xiB:xi(def.bat),home:rf?(VENUE_HOME.get(rf.venue)||home):home,maxOv:def.maxOv});
  M.noWeather=true;M.challenge=def;M.key='CH.'+def.id;M.mods={bat:{},bowl:{}};
  M.toss={w:def.bowl,choice:'bat',bat:def.bowl};M.state='live';
  if(fmt!=='TEST'){
    const I1=startInnings(M,def.bowl),f1=def.first;fakeInnings(M,I1,def.target-1,f1?f1[0]:rndInt(5,9),f1?f1[1]:M.maxOv*6,true,f1&&f1[0]>=10?'all out':'overs');
    const I2=startInnings(M,def.bat);I2.target=def.target;
    const real=def.crease&&reliveOrder(I2,def.crease,def.wkts);
    fakeInnings(M,I2,def.target-def.need,def.wkts,M.maxOv*6-def.balls,false);
    if(real)reliveCrease(I2,def.crease);
  }else{
    // three innings done, the fourth under way; the clock set so def.overs remain
    const A=def.bowl,B=def.bat,t=def.target;
    const I1=startInnings(M,A);fakeInnings(M,I1,Math.round(t*.55),10,6*112,true,'all out');
    const I2=startInnings(M,B);fakeInnings(M,I2,Math.round(t*.35),10,6*96,true,'all out');
    const I3=startInnings(M,A);fakeInnings(M,I3,t-1-I1.runs+I2.runs,6,6*70,true,'declared');
    const I4=startInnings(M,B);I4.target=t;
    const made=t-def.need,ovNow=Math.max(1,Math.round(450-def.overs-112-96-70-8-60));
    fakeInnings(M,I4,made,def.wkts,6*Math.min(ovNow,140),false);
    M.lost=Math.max(0,TEST_OVERS-def.overs-testBallsBowled(M)/6-TEST_CHANGEOVER*3);M.wxDay=5;
  }
  const you=def.kind==='chase'||def.kind==='survive'?def.bat:def.bowl;
  M.manualCaptain={[you]:true};M.you=you;
  return M;
}
// ---------- the sandbox ----------
function enterSandbox(def){
  if(S&&!S.sandbox){saveGame();CH.main=S;}
  const keep=CH.main?CH.main.settings:{};
  S=newCareer({name:'Challenge: '+def.title});S.sandbox={def,started:Date.now()};
  for(const k of['dice','broadcast','font','sound','tv','voice','voiceName','voiceRate','ballDelay','batColours','ratings','form'])if(keep[k]!==undefined)S.settings[k]=keep[k];
  S.settings.captain='manual';
  if(def.kind==='cup'){
    const c=createCup({...def.cup,name:def.title});S.sandbox.cup=c.id;
    S.coach=newCoach(def.team,def.cup.start);S.settings.myTeam=def.team;S.settings.captain='manual';
  }
  saveGame();
}
function leaveSandbox(){
  if(!S||!S.sandbox)return;
  try{localStorage.removeItem(SANDBOX_KEY);}catch(e){}
  S=CH.main||readSlot(SLOT)||null;CH.main=null;LM=null;
  if(S)loadSlot(SLOT);
}
function startChallenge(def){
  enterSandbox(def);
  if(def.kind==='cup'){go('tour',S.sandbox.cup);return;}
  LM=def.kind==='dream'?buildDreamMatch(def):buildChallengeMatch(def);S.live=LM;saveGame();go('match');
}
// Stars: 0 lost, 1 close, 2 done, 3 done in style.
function judgeChallenge(def,E,M){
  let ok=false,stars=0,text='';
  const r=E.result,you=M?M.you:def.team;
  if(def.kind==='chase'){const I=E.inns[E.inns.length-1],left=(I.mo||50)*6-I.lb;ok=r.winner===def.bat;
    stars=ok?(left>=Math.max(6,def.balls*.15)||10-I.wkts>=3?3:2):(r.type==='runs'&&r.margin<=3?1:0);
    text=ok?`Chased down with ${plural(left,'ball')} and ${plural(10-I.wkts,'wicket')} to spare.`:`Fell short by ${r.margin||0}.`;}
  else if(def.kind==='defend'){ok=r.winner===def.bowl;const I=E.inns[E.inns.length-1];
    stars=ok?(r.margin>=Math.max(4,def.need*.3)||I.wkts>=10?3:2):((I.mo||50)*6-I.lb<=1?1:0);text=ok?`Defended - won by ${plural(r.margin,'run')}.`:'They got there.';}
  else if(def.kind==='survive'){const I=E.inns[3];ok=r.type==='draw'||r.winner===def.bat;stars=ok?(I&&10-I.wkts>=3?3:2):(I&&I.wkts>=10&&testOversLeft(M)<=5?1:0);text=ok?'Saved it.':'Bowled out.';}
  else if(def.kind==='dream'){ok=r.winner===def.ta;stars=ok?3:0;text=r.winner?`${teamName(r.winner)}'s dream XI wins: ${r.text}.`:r.text+'.';}
  else if(def.kind==='bowlout'){ok=r.winner===def.bowl;stars=ok?3:0;text=ok?'Bowled them out.':'They survived.';}
  return{ok,stars,text,you};
}
// after each match in the sandbox: a scenario is judged at once, a cup when its last game is done
function challengeAfter(M,E){
  const def=S.sandbox.def;
  if(M.challenge){S.sandbox.res=judgeChallenge(def,E,M);if(def.kind==='dream')achieve('dream');else recordChallenge(def,S.sandbox.res);return;}
  if(def.kind==='cup'&&S.sandbox.cup){
    const cup=cupById(S.sandbox.cup);if(!cup.fix.every(f=>S.done[f.key])||S.sandbox.res)return;
    const champ=cupChampion(cup),mine=cupMatches(cup).filter(x=>x.teams.includes(def.team));
    const fin=mine.some(x=>x.stage==='Final'),lost=mine.filter(x=>x.result.winner&&x.result.winner!==def.team).length;
    const ok=champ===def.team,stars=ok?(lost===0?3:2):fin?1:0;
    S.sandbox.res={ok,stars,text:ok?`${teamName(def.team)} are champions${lost?'':' - unbeaten'}!`:`${teamName(champ)} won it. ${fin?'So close - you made the final.':''}`};
    recordChallenge(def,S.sandbox.res);
  }
}
function recordChallenge(def,res){
  const st=readStars(),prev=st[def.id]||{stars:0};
  if(res.stars>prev.stars)st[def.id]={stars:res.stars,date:new Date().toISOString().slice(0,10),title:def.title};
  writeStars(st);
  achieve('challenge1');if(res.stars===3)achieve('challenge3');
  if(CHALLENGES.every(c=>(st[c.id]||{}).stars>=1))achieve('challengeAll');
  if(CHALLENGES.every(c=>(st[c.id]||{}).stars===3))achieve('challengeAll3');
}
