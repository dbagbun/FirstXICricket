// ═══ DRS & UMPIRES — the card is the truth; the umpire can get it wrong; reviews put it right ═══
// After the card (and the wicket colour) settles a ball, the on-field umpire rules:
//  - an lbw or caught-behind on the card can be given not out (UMP.miss),
//  - a big appeal on a wicket the batter's colour saved, or now and then any dot ball, can be given out.
// The side the call went against may review (M.drs.n per innings, a failed review costs one).
// An lbw review rolls 1-100 for umpire's call: UMP.uc or under and the on-field call stands
// (the review is kept from October 2017). Otherwise the card's truth wins.
// M.drs = null (perfect umpires) | {on, n, uc}: on = reviews in use (DRS_FROM by format, or always).
const UMP={miss:{lbw:.1,ctwk:.07},appeal:.4,falseApp:.07,falseDot:.0015,uc:25,
  ai:{miss:.8,wrongOut:.85,outLbw:.15,outWk:.08,appeal:.1}};
const DRS_FROM={TEST:'2009-11-24',ODI:'2011-02-19',T20:'2017-10-07'};
const DRS_CODE={O:'overturned',S:'stands',U:"umpire's call",M:'umpire error'};
function drsSetup(M){
  const mode=S.settings.drs||'era',d=M.date,always=mode==='on';
  if(mode==='off'){M.drs=null;return;}
  const modern=always||d>='2020-06-01';
  M.drs={on:always||d>=(DRS_FROM[M.fmt]||'9999'),n:M.fmt==='TEST'?(modern?3:2):(modern?2:1),uc:always||d>='2017-10-01'};
}
// The on-field decision for a settled ball: null when there's nothing to rule on.
function umpireCheck(M,I,t,how0,voided){
  if(t.w){
    if(t.how!=='lbw'&&t.how!=='ctwk')return null;
    const err=rnd()<UMP.miss[t.how];
    return{truth:1,field:err?0:1,how:t.how,side:err?I.bowl:I.bat};
  }
  if(t.ex||t.bat||t.exType)return null;
  if(voided&&(how0==='lbw'||how0==='ctwk')){
    if(rnd()>=UMP.appeal)return null;
    const err=rnd()<UMP.falseApp;
    return{truth:0,field:err?1:0,how:how0,side:err?I.bat:I.bowl};
  }
  if(rnd()<UMP.falseDot)return{truth:0,field:1,how:rnd()<.6?'lbw':'ctwk',side:I.bat};
  return null;
}
const revLeft=(M,I,side)=>{if(!I.rev)I.rev={[I.bat]:M.drs.n,[I.bowl]:M.drs.n};return I.rev[side];};
// Would the AI review? It has a feel for the truth, more so with a set batter in.
function aiReview(M,I,R){
  const A=UMP.ai;let p;
  if(!R.field)p=R.truth?A.miss:A.appeal;
  else p=R.truth?(R.how==='lbw'?A.outLbw:A.outWk):A.wrongOut;
  if(revLeft(M,I,R.side)===1)p*=.8;
  const B=I.bt[I.st];if(R.field&&B&&B.r>=50)p=Math.min(.95,p*1.4);
  return rnd()<p;
}
function decideReview(M,yes){const R=M.cur&&M.cur.rev;M.pending=null;if(R)R.ask=!!yes;}
// Settles an open decision: asks your captain (M.askRev, from ball-by-ball play), rolls umpire's call, then bowls the ball.
function reviewStep(M,I,manualRoll){
  const C=M.cur,R=C.rev;
  if(R.ask==null){
    if(!M.drs.on||revLeft(M,I,R.side)<=0)R.ask=false;
    else if(M.manualCaptain?.[R.side]&&M.askRev){M.pending={type:'review',side:R.side,how:R.how,field:R.field,pid:I.st,bowler:C.bowler,left:revLeft(M,I,R.side)};return{need:'review'};}
    else R.ask=aiReview(M,I,R);
  }
  if(R.ask&&R.how==='lbw'&&R.uc==null){if(M.manual&&manualRoll==null)return{need:'uc'};R.uc=manualRoll??roll100();}
  let out=R.field,code='';
  if(R.ask){
    if(R.how==='lbw'&&R.uc<=UMP.uc){code='U';if(!M.drs.uc)I.rev[R.side]--;}
    else if(R.truth!==R.field){out=R.truth;code='O';}
    else{code='S';I.rev[R.side]--;}
  }else if(R.truth!==R.field)code='M';
  const D=R.D,t=D.t;
  if(out&&!t.w){Object.assign(t,{w:true,how:R.how,bat:0,ex:0,exType:''});D.voided=false;}
  if(!out&&t.w)Object.assign(t,{w:false,how:'',color:''});
  if(code)D.ump={side:R.side,how:R.how,field:R.field,truth:R.truth,rev:R.ask?1:0,uc:R.uc||0,code,out:out?1:0,left:M.drs.on?revLeft(M,I,R.side):0,on:M.drs.on?1:0};
  delete C.rev;
  return applyBall(M,I,D);
}
function drsText(e){
  const p=pName(e.pid),how=e.how==='lbw'?'lbw':'caught behind',team=teamName(e.side);
  const why=e.on?(e.left>0?' - not reviewed':' - no reviews left'):'';
  if(e.code==='M')return e.field?`${p} given out ${how}, but replays show it was not out${why}`:`Not out says the umpire, but replays show ${p} was ${how}${why}`;
  const asked=e.field?`${p} reviews the ${how} decision`:`${team} review the not-out ${how} appeal`;
  if(e.code==='U')return`${asked} - umpire's call (roll ${e.uc}): ${e.out?'still out':'still not out'}`;
  if(e.code==='O')return`${asked} - OVERTURNED: ${e.out?'OUT':'not out'}`;
  return`${asked} - the decision stands, review lost (${e.left} left)`;
}
// Archived per match: [innings, reviewing side, batter, how, code, out].
const drsArchive=M=>M.events.filter(e=>e.t==='drs').map(e=>[e.inn,e.side,e.pid,e.how,e.code,e.out]);
function drsSummary(E){
  if(!E.drs||!E.drs.length)return'';
  const by=t=>{const r=E.drs.filter(d=>d[1]===t&&d[4]!=='M');return r.length?`${teamShort(t)} ${r.filter(d=>d[4]==='O').length}/${r.length} successful`:'';};
  const err=E.drs.filter(d=>d[4]==='M').length;
  return[...E.teams.map(by).filter(Boolean),err?plural(err,'umpiring error')+' stood':''].filter(Boolean).join(' · ');
}
