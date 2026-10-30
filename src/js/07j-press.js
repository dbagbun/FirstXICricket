// ═══ PRESS & MEDIA — back-page headlines, press conferences, dressing-room morale, media pressure ═══
// Headlines (S.press.heads) follow the team you follow or coach. As coach, every match of yours opens a press
// conference (S.coach.pc): what you say moves board confidence (c), dressing-room morale (m), media pressure (h),
// can fire up or rattle a named player for the next match (p, up/dn chances -> S.coach.boost, one form step),
// or raise or lower the stakes of the series target (ob: its weight). Unanswered questions lapse at your next match.
// Morale 75+ lifts one top-order batter a form step, 25 or under drops one; pressure 70+ makes defeats cost more.
const PAPERS=['The Daily Wicket','Cover Point','The Long Room Gazette','Third Man','The Sightscreen','Silly Point Sunday'];
const PRESS_KEEP=40;
const hstr=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
function press(){if(!S.press)S.press={heads:[]};return S.press;}
const HEADLINES={
  final:['{T} ARE CHAMPIONS','GLORY! {T} LIFT THE TROPHY','{T} CONQUER ALL'],finalL:['FINAL HEARTBREAK FOR {T}','{T} FALL AT THE LAST'],
  upset:['SHOCK! {T} STUN {O}','GIANT-KILLERS: {T} TOPPLE {O}'],upsetL:['HUMILIATION FOR {T}','{T} RED-FACED AFTER {O} DEFEAT'],
  ton:['{P} TON SINKS {O}','MAGNIFICENT {P} POWERS {T} HOME','{P} CENTURY THE DIFFERENCE'],five:['{P} FIVE-FOR SKITTLES {O}','{P} RUNS THROUGH {O}'],
  close:['{T} HOLD THEIR NERVE','NAIL-BITER! {T} EDGE IT',"THRILLER GOES {T}'S WAY"],win:['{T} CRUISE PAST {O}','{P} THE HERO AS {T} SEE OFF {O}','JOB DONE FOR {T}'],
  collapse:['{T} CRUMBLE FOR {N}','SHAMBLES! {T} ROLLED FOR {N}'],closeL:['HEARTBREAK FOR {T}','SO NEAR FOR {T}'],
  nemesis:['{P} DESTROYS {T}','{T} HAVE NO ANSWER TO {P}'],loss:['{T} BEATEN BY {O}','BACK TO THE DRAWING BOARD FOR {T}','{O} TOO GOOD FOR {T}'],
  pressure:['PRESSURE MOUNTS ON {T} COACH','{T} COACH IN THE FIRING LINE'],
  tie:['TIED! UNBELIEVABLE SCENES','HONOURS EVEN IN A CLASSIC'],draw:['STALEMATE AT {V}','{T} BATTLE TO A DRAW'],nr:['RAIN HAS THE FINAL SAY','WASHED OUT'],
};
const rankGap=(E,T,O)=>INTL.includes(E.fmt)?rankPtsOf(T,E.fmt==='T20'?'ODI':E.fmt)-rankPtsOf(O,E.fmt==='T20'?'ODI':E.fmt):0;
function headlineFor(E,T){
  const O=otherOf(E,T),R=E.result,won=R.winner===T,lost=!!R.winner&&!won,L=Object.values(playerMatchLines(E));
  const val=l=>l.r+l.w*25,best=arr=>arr.slice().sort((a,b)=>val(b)-val(a))[0];
  const mine=L.filter(l=>l.team===T),theirs=L.filter(l=>l.team===O);
  const gap=rankGap(E,T,O),final=/final/i.test(E.stage||'')&&!/semi|quarter/i.test(E.stage||'');
  const close=(R.type==='runs'&&R.margin<=(E.fmt==='TEST'?25:10))||(R.type==='wkts'&&R.margin<=2)||R.type==='so';
  const myInns=E.inns.filter(I=>I.bat===T),low=myInns.find(I=>I.wkts===10&&I.runs<(E.fmt==='TEST'?150:E.fmt==='ODI'?140:100));
  const ton=mine.filter(l=>l.c100).sort((a,b)=>b.hs-a.hs)[0],five=mine.filter(l=>l.w5).sort((a,b)=>b.w-a.w)[0];
  const killer=theirs.filter(l=>l.c100||l.w5)[0];
  let k,p=0;
  if(R.type==='nr')k='nr';else if(R.type==='tie')k='tie';else if(R.type==='draw')k='draw';
  else if(won){k=final?'final':gap<-60?'upset':ton?'ton':five?'five':close?'close':'win';p=k==='ton'?ton.pid:k==='five'?five.pid:(best(mine)||{}).pid;}
  else{const C=S.coach;k=final?'finalL':gap>60?'upsetL':low?'collapse':close?'closeL':killer?'nemesis':C&&C.team===T&&(C.heat||0)>=70?'pressure':'loss';p=k==='nemesis'?killer.pid:0;}
  const list=HEADLINES[k],h=hstr(E.id+':'+T);
  const fill=s=>s.replace('{T}',teamName(T).toUpperCase()).replace('{O}',teamName(O).toUpperCase()).replace('{P}',p?bugName(p).toUpperCase():teamShort(T))
    .replace('{N}',low?low.runs:'').replace('{V}',String(E.city||E.venue||'').toUpperCase());
  const stars=[best(mine),best(theirs)].filter(l=>l&&val(l)>=40).map(l=>`${pName(l.pid)} ${l.w>=3?l.w+'/'+l.br:l.r}`);
  return{id:E.id,date:E.date,team:T,fmt:E.fmt,paper:PAPERS[h%PAPERS.length],h:fill(list[(h>>>3)%list.length]),s:[R.text,...stars].join(' · ')};
}
function pressTeam(){return S.coach&&S.coach.team?S.coach.team:managedTeam()||S.settings.myTeam||0;}
// After every match (career, not the sandbox): the back page for your team.
function pressAfter(E){
  if(S.sandbox)return null;
  const T=pressTeam();if(!T||!E.teams.includes(T))return null;
  const P=press(),hd=headlineFor(E,T);P.heads.push(hd);if(P.heads.length>PRESS_KEEP)P.heads.shift();
  return hd;
}
const headOf=id=>S.press&&S.press.heads.find(h=>h.id===id)||null;
// ---------- dressing room ----------
function moraleOf(C){if(C.morale==null)C.morale=55;if(C.heat==null)C.heat=30;return C.morale;}
// Your team's result moves morale and pressure; then both drift back. Called from coachAfter.
function moodAfter(E,won,lost,gap){
  const C=S.coach;moraleOf(C);
  if(won){C.morale+=3;C.heat-=4;}else if(lost){C.morale-=3;C.heat+=gap>15?8:5;if(C.heat>=70)C.conf=clamp(C.conf-1,0,100);}
  C.morale=clamp(Math.round(C.morale+(55-C.morale)*.05),0,100);C.heat=clamp(Math.round(C.heat+(30-C.heat)*.05),0,100);
}
// The engine's view of what you said: one form step for named players, morale for one top-order batter.
function pressMods(M,mods){
  const C=S.coach;if(!C||!C.team||!M.teams.includes(C.team))return;
  for(const[pid,b]of Object.entries(C.boost||{}))if(M.xi[C.team].bat.includes(+pid))mods.bat[pid]=clamp((mods.bat[pid]||0)+b,-1,1);
  const mo=moraleOf(C);if(mo>25&&mo<75)return;
  const top=M.xi[C.team].bat.slice(0,6).filter(p=>!mods.bat[p]);if(!top.length)return;
  const p=top[hstr(M.date+M.id)%top.length];mods.bat[p]=mo>=75?1:-1;M.moraleP={pid:p,up:mo>=75};
}
// ---------- press conferences ----------
const QOPT={
  win:[['The players deserve every bit of the credit.',{m:4}],['We executed the plan we set out.',{c:2,m:-1}],["Pleased, but there's plenty to work on.",{m:1,h:-3}]],
  loss:[["I back this group - we'll bounce back.",{m:4,h:2}],['Some senior players need to take a hard look at themselves.',{m:-6,c:2,h:-4}],["That's on me. I take responsibility.",{c:-1,h:-6,m:2}]],
  even:[["We'll take it.",{m:2}],['We should have won that.',{c:1,m:-2}]],
  job:[['Judge me at the end of the series.',{h:-5}],["I've never been more sure of anything.",{c:3,h:5}],["That's a question for the board.",{c:-2,h:3}]],
};
function pressQs(E,T){
  const R=E.result,won=R.winner===T,lost=!!R.winner&&!won,C=S.coach,h=hstr(E.id),qs=[];
  const O=teamName(otherOf(E,T));
  if(won)qs.push({t:['A fine win today. What made the difference?',`Beating ${O} - where does that rank for you?`][h%2],o:QOPT.win});
  else if(lost)qs.push({t:['A tough day. What went wrong?',`${O} were better today. Why?`][h%2],o:QOPT.loss});
  else qs.push({t:'Are you happy with the result?',o:QOPT.even});
  const L=Object.values(playerMatchLines(E)).filter(l=>l.team===T),fmt=E.fmt;
  const star=L.filter(l=>l.c100||l.w5||l.pid===E.motm).sort((a,b)=>(b.r+b.w*25)-(a.r+a.w*25))[0];
  const flop=E.xi[T].slice(0,5).find(p=>{const f=formOf(p,fmt).bat;return f!=null&&f<=FORM_COLD[fmt]&&(S.stats[fmt][p]||{}).m>=8;});
  if(lost&&moraleOf(C)!=null&&C.heat>=70)qs.push({t:'Reports say the board is losing patience. Are you the right person for this job?',o:QOPT.job});
  else if(star&&(!flop||h%2))qs.push({t:`Is ${pName(star.pid)} the best ${star.w>=star.r/20?'bowler':'batter'} in the world right now?`,
    o:[["No question. He's world class.",{p:star.pid,up:.55,dn:.2,h:1}],["He'll be the first to say there's more to come.",{p:star.pid,up:.35,m:1}],["It's a team game.",{m:2}]]});
  else if(flop)qs.push({t:`${pName(flop)} is struggling. Does he keep his place?`,
    o:[['He has my full backing.',{p:flop,up:.5,dn:.1,m:2}],['He knows he needs runs.',{p:flop,up:.4,dn:.4}],["Everyone's place is under review.",{p:flop,up:.2,dn:.3,m:-3,c:1}]]});
  return qs.map(q=>({...q,a:null}));
}
// Unanswered questions lapse ("no comment"): a little more pressure each.
function pressLapse(){
  const C=S.coach,P=C&&C.pc;if(!P)return;
  const n=P.qs.filter(q=>q.a==null).length;
  if(n){moraleOf(C);C.heat=clamp(C.heat+n,0,100);}
  C.pc=null;
}
function pressConf(E){
  const C=S.coach;pressLapse();
  C.pc={date:E.date,mid:E.id,sid:E.sid,qs:pressQs(E,C.team)};
}
// Before a series, with the board's target: talk it up (higher stakes) or down.
function pressPre(fx,o){
  const C=S.coach;if(!C.pc)C.pc={date:fx.date,mid:null,sid:fx.sid,qs:[]};
  C.pc.sid=fx.sid;
  C.pc.qs.push({t:`${fx.title}: the board want you to ${o.text.charAt(0).toLowerCase()+o.text.slice(1)}. Can you deliver?`,pre:fx.sid,a:null,
    o:[['Yes - and you can quote me on that.',{ob:1.35,m:3,h:4}],["It's a fair target.",{}],["We're building for the future.",{ob:.7,h:3,c:-1}]]});
}
function pressAnswer(qi,oi){
  const C=S.coach,P=C&&C.pc,q=P&&P.qs[qi];if(!q||q.a!=null||!q.o[oi])return null;
  q.a=oi;const fx=q.o[oi][1],out=[];moraleOf(C);
  const PR=press();(PR.quotes=PR.quotes||[]).push({date:careerDate(),team:C.team,q:q.t,a:q.o[oi][0],bold:Math.abs(fx.c||0)+Math.abs(fx.h||0)+Math.abs(fx.m||0)+(fx.ob?3:0)+(fx.p?2:0)});
  if(PR.quotes.length>60)PR.quotes.shift();
  C.conf=clamp(C.conf+(fx.c||0),0,100);C.morale=clamp(C.morale+(fx.m||0),0,100);C.heat=clamp(C.heat+(fx.h||0),0,100);
  if(fx.p){const r=rnd(),b=r<(fx.up||0)?1:r<(fx.up||0)+(fx.dn||0)?-1:0;
    if(b){(C.boost=C.boost||{})[fx.p]=b;out.push(`${pName(fx.p)} ${b>0?'is fired up by your words.':'looks rattled.'}`);}}
  if(fx.ob){const o=C.objs.find(x=>x.sid===q.pre&&x.status==='open');if(o){o.w=Math.round(o.w*fx.ob*100)/100;o.talk=fx.ob>1?'bold':'modest';}}
  for(const t of out)coachNews(t,'');
  if(typeof achieve==='function')achieve('press');
  return out;
}
