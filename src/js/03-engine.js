// ═══ MATCH ENGINE — run-rate cards, one roll per over, wicket colours (the First XI rules) ═══
// Each over: pick a run-rate card (weights from the bowler's rating, shifted by the match situation),
// roll 1-100 once, and read balls 1-6 off that row. A wide or no-ball is re-bowled off a fresh roll
// (column 1 of the new row). A wicket only counts if its colour can get that batter out: a BLUE batter
// falls only to BLUE, GREEN to BLUE/GREEN, RED to anything; otherwise the ball is a dot.
// Batting colours (batColour): the classic rule is by position (1-6 BLUE, 7-9 GREEN, 10-11 RED). With player
// colours, a colour you set (workbook BatGroup or the player card) applies exactly; a derived colour is lifted
// at most one step by his position (a promoted all-rounder keeps the top-order BLUE; a No.11 sent in to open is
// GREEN, not BLUE), except an associate's second letter against a Test nation ('BG', 'GR').
const RR_CODES=['3','4A','4B','5','6','7'];
const CARD_WEIGHTS={
  ODI:{1:[35,30,20,10,4,1],2:[15,30,30,15,8,2],3:[5,15,30,30,15,5],4:[2,8,15,30,30,15],5:[1,4,10,20,35,30]},
  // Tests: RR_3 carries most overs and RR_7 is the wicket card: ~3.4 an over, ~34 a wicket (tests/engine-stats.js).
  TEST:{1:[84,5,4,2,0,5],2:[80,7,6,3,0,4],3:[76,9,8,3,1,3],4:[70,12,10,4,2,2],5:[62,15,13,6,2,2]},
};
// Test pitches wear: from day 4, points move from RR_3 to RR_7 (double for spinners).
const TEST_WEAR={4:2,5:4};
// ...and the last innings carries scoreboard pressure: extra points onto RR_7 by innings number.
const TEST_INN_PRESSURE={3:1,4:4};
// Pitch (Tests): points moved between RR_3 and RR_7 for everyone / pace / spin, and a wear multiplier.
const PITCHES={
  flat:{name:'Flat deck',all:-3,P:0,S:0,wear:1,desc:'A road. Bat first and bat big.'},
  normal:{name:'Good pitch',all:0,P:0,S:0,wear:1,desc:'Something for everyone.'},
  green:{name:'Green top',all:0,P:3,S:-1,wear:.5,desc:'Grass on it - the seamers will be licking their lips.'},
  turner:{name:'Turner',all:0,P:-1,S:3,wear:1.5,desc:'Dry and cracked. It will spin, and more as it wears.'},
};
const PITCH_ODDS={asia:{flat:.4,normal:.3,turner:.25,green:.05},eng:{green:.35,normal:.45,flat:.2},
  aus:{normal:.5,flat:.25,green:.25},wi:{flat:.35,normal:.45,green:.1,turner:.1}};
const PITCH_REGION={3:'asia',6:'asia',7:'asia',11:'asia',4:'eng',9:'eng',1:'aus',5:'aus',8:'wi',10:'wi'};
function rollPitch(home){
  const o=PITCH_ODDS[PITCH_REGION[home]]||PITCH_ODDS.wi;let r=rnd();
  for(const k in o){r-=o[k];if(r<0)return k;}
  return'normal';
}
const TEST_OVERS=450,TEST_CHANGEOVER=2,FOLLOW_ON=200,NEW_BALL=80;

function baseWeights(fmt,rating){return CARD_WEIGHTS[fmt][clamp(rating|0||3,1,5)].slice();}
// Port of ApplyShift: slide the weights right (faster cards) or left; what falls off is lost and the
// remainder is topped up at the end that gained.
function applyShift(W,shift){
  if(!shift)return W;
  const t=W.map((_,i)=>{const s=i-shift;return s>=0&&s<6?W[s]:0;});
  const tot=sum(t);
  if(tot===0)return[16,16,16,16,16,20];
  if(tot!==100){if(shift>0)t[5]+=100-tot;else t[0]+=100-tot;}
  return t;
}
function wearWeights(M,b,W){
  if(M.fmt!=='TEST')return W;
  const P=PITCHES[M.pitch]||PITCHES.normal;
  const w=Math.round((TEST_WEAR[testDay(M)]||0)*(b.style==='S'?2:1)*P.wear)+P.all+(P[b.style]||0)+(TEST_INN_PRESSURE[curInn(M).no]||0);
  const m=w>=0?Math.min(w,W[0]):-Math.min(-w,W[5]);
  W[0]-=m;W[5]+=m;return W;
}
function pickCard(W){
  const r=roll100();let c=0;
  for(let i=0;i<6;i++){c+=W[i];if(r<=c)return RR_CODES[i];}
  return'3';
}
function parseToken(tok){
  let t=String(tok||'0').toUpperCase().trim();
  if(t===''||t==='.')t='0';
  const o={bat:0,ex:0,exType:'',w:false,color:'',how:''};
  if(/^\d+$/.test(t)){o.bat=+t;return o;}
  if(t==='WD'||t==='WIDE'){o.ex=1;o.exType='wd';return o;}
  if(t==='NB'||t==='NOBALL'||t==='NO_BALL'){o.ex=1;o.exType='nb';return o;}
  let m=/^LB(\d+)$/.exec(t);if(m){o.ex=+m[1];o.exType='lb';return o;}
  m=/^B(\d+)$/.exec(t);if(m){o.ex=+m[1];o.exType='b';return o;}
  if(t.startsWith('W_')){
    const parts=t.slice(2).split('_');
    o.w=true;o.color=parts[0];
    const d=parts.slice(1).join('_');
    o.how=/WK/.test(d)?'ctwk':/OFIELD/.test(d)?'ctof':/CAUGHT|CATCH/.test(d)?'ct':/LBW/.test(d)?'lbw':/RUN/.test(d)?'ro':/STUMP/.test(d)?'st':'b';
    return o;
  }
  return o;
}
const wicketCounts=(group,color)=>group==='B'?color==='BLUE':group==='G'?(color==='BLUE'||color==='GREEN'):color!=='';
const COL_RANK={B:0,G:1,R:2};
function batColour(M,pid,pos,bowlTeam){
  const pc=posColour(pos);
  if(M.batMode==='position')return pc;
  const a=pAttr(pid,M.date),c=a.bat;
  if(!c)return pc;
  const vsFull=!!TEAMS.get(+bowlTeam)?.full;
  const own=c.length===2?c[vsFull?1:0]:c;
  if(a.batSrc==='h'||a.batSrc==='e'||(c.length===2&&vsFull))return own;
  return COL_RANK[pc]<COL_RANK[own]?'BGR'[COL_RANK[own]-1]:own;
}
const BOWLER_CREDIT={b:1,lbw:1,ct:1,ctof:1,ctwk:1,st:1,ro:0};

// ---------- match setup ----------
let MATCH_SEQ=0;
function newMatch(o){
  const M={
    id:o.id||('m'+Date.now().toString(36)+(MATCH_SEQ++)),fmt:o.fmt||'ODI',fid:o.fid||null,cid:o.cid||null,sid:o.sid||null,
    series:o.series||'',stage:o.stage||'',date:o.date,venue:o.venue||'',city:o.city||'',teams:[+o.a,+o.b],
    xi:{[o.a]:o.xiA,[o.b]:o.xiB},plans:{},toss:null,inns:[],state:'pre',result:null,
    maxOv:o.maxOv||50,events:[],pending:null,followOn:false,cur:null,home:o.home||0,batMode:o.batMode||'player',
  };
  if(M.fmt==='TEST')M.pitch=o.pitch||rollPitch(M.home);
  // Historical bowling plans (ODIs): the real bowler of each over, by player id.
  if(M.fmt==='ODI'&&o.cid&&!o.noPlans)for(const t of M.teams){
    const map=fixturePlan(o.cid,t),orig=fixtureXI(o.cid,t);
    if(map&&orig)M.plans[t]=[...map].map(ch=>ch==='.'?0:orig.bat['abcdefghijk'.indexOf(ch)]);
  }
  return M;
}
function doToss(M,winner,choice){
  winner=winner??pick(M.teams);
  if(!choice)choice=rnd()<(M.fmt==='TEST'?.7:.55)?'bat':'bowl';
  const other=M.teams[0]===winner?M.teams[1]:M.teams[0];
  M.toss={w:winner,choice,bat:choice==='bat'?winner:other};
  M.state='live';
  startInnings(M,M.toss.bat);
  testWeather(M);
}
const otherTeam=(M,t)=>M.teams[0]===+t?M.teams[1]:M.teams[0];
const curInn=M=>M.inns[M.inns.length-1];

function startInnings(M,bat){
  const bowl=otherTeam(M,bat),x=M.xi[bat];
  const I={no:M.inns.length+1,bat,bowl,runs:0,wkts:0,lb:0,ex:{b:0,lb:0,wd:0,nb:0},order:x.bat.slice(),
    st:x.bat[0],ns:x.bat[1],bt:{},bw:{},bwOrder:[],fow:[],parts:[],part:null,closed:false,why:'',target:0,
    overs:[],balls:[],hat:{},eng:null,ms:{}};
  I.bt[I.st]=newBat(0);I.bt[I.ns]=newBat(1);
  I.part={a:I.st,b:I.ns,r:0,bl:0,ra:0,rb:0,w:1};
  if(M.fmt==='ODI'&&I.no===2)I.target=M.inns[0].runs+1;
  if(M.fmt==='TEST'&&I.no===4)I.target=testTotals(M,bowl)-testTotals(M,bat)+1;
  I.eng=bowlEngInit(M,I);
  M.inns.push(I);M.cur=null;
  return I;
}
const newBat=idx=>({r:0,b:0,f4:0,f6:0,out:null,idx,fifty:0,hundred:0});
function testTotals(M,t){return sum(M.inns.filter(i=>i.bat===+t).map(i=>i.runs));}

// ---------- bowling engine (port of modBowlingEngine) ----------
const SPELLS={
  ODI:{P:[3,5,3,4],S:[4,8,2,3],M:[2,4,3,4]},
  TEST:{P:[4,7,5,9],S:[6,14,3,6],M:[3,6,5,8]},
};
function bowlEngInit(M,I){
  const x=M.xi[I.bowl],B=[];let total=0;
  const add=(pid,style,rating,max)=>{B.push({pid,style,rating,max,used:0,last:0,spell:0,spellMax:0,rest:0,active:false});total+=max;};
  x.bat.forEach((pid,i)=>{
    const a=pAttr(pid,M.date);
    if(a.style!=='N'&&a.rating<=6&&a.max>0)add(pid,a.style,a.rating,M.fmt==='TEST'?999:a.max);
  });
  // Safety net: not enough overs (or bowlers) -> top-order part-timers, weak.
  const need=M.fmt==='TEST'?5:50;
  const enough=()=>M.fmt==='TEST'?B.length>=need:total>=need;
  for(let pass=0;pass<2&&!enough();pass++)for(let i=0;i<11&&!enough();i++){
    const pid=x.bat[pass?10-i:i];
    if(B.some(b=>b.pid===pid)||pid===x.wk)continue;
    add(pid,'M',6,M.fmt==='TEST'?999:3);
  }
  // Bowlers from the real plan who aren't in the list yet bowl what they really bowled.
  const plan=M.plans[I.bowl];
  if(plan){
    const cnt={};plan.forEach(p=>{if(p)cnt[p]=(cnt[p]||0)+1;});
    for(const p in cnt){
      const pid=+p;if(!x.bat.includes(pid))continue;
      const b=B.find(b=>b.pid===pid);
      if(b)b.max=Math.max(b.max,cnt[p]);
      else{const a=pAttr(pid,M.date);add(pid,a.style==='N'?'M':a.style,a.style==='N'?4:a.rating,Math.max(cnt[p],a.max||0));}
    }
  }
  return{B,lastIdx:-1,plan:plan||null,newBallAt:1};
}
function phaseBonus(M,I,style,over){
  if(M.fmt==='ODI'){
    if(style==='P')return over<=10?15:over<=15?8:over<=35?-5:over<=44?5:15;
    if(style==='S')return over<=10?-5:over<=15?5:over<=35?15:over<=44?5:-5;
    if(style==='M')return over<=10?0:over<=35?5:-3;
    return 0;
  }
  const age=over-I.eng.newBallAt,day=testDay(M);
  if(style==='P')return age<=12?15:age<=35?-5:age<=60?0:3;
  if(style==='S')return(age<=10?-8:age<=25?6:15)+(day>=4?5:0);
  if(style==='M')return age<=10?0:4;
  return 0;
}
function chooseBowler(M,I,over){
  const E=I.eng,B=E.B;
  if(M.fmt==='TEST'&&over>1&&(over-E.newBallAt)>=NEW_BALL)E.newBallAt=over;
  if(E.plan&&E.plan[over-1]){
    const i=B.findIndex(b=>b.pid===E.plan[over-1]);
    if(i>=0&&i!==E.lastIdx&&(M.fmt!=='ODI'||B[i].used<10)){
      if(!B[i].active){B[i].active=true;B[i].spell=0;B[i].spellMax=99;}
      return i;
    }
  }
  let best=-1,bs=-1e9;
  B.forEach((b,i)=>{
    if(b.used>=b.max||i===E.lastIdx||over<b.rest)return;
    let s=0;
    if(b.active&&b.spell<b.spellMax)s+=30;
    s+=M.fmt==='ODI'?(b.max-b.used)*2:-b.used*0.4;
    s+=phaseBonus(M,I,b.style,over);
    s+=(6-Math.min(b.rating,5))*3;
    s+=rnd()*15;
    if(s>bs){bs=s;best=i;}
  });
  if(best<0)best=B.findIndex((b,i)=>b.used<b.max&&i!==E.lastIdx);
  if(best<0)best=B.findIndex(b=>b.used<b.max);
  if(best<0)best=B.findIndex((b,i)=>i!==E.lastIdx);
  const b=B[best];
  if(!b.active){b.active=true;b.spell=0;const sp=SPELLS[M.fmt][b.style]||[2,4,2,3];b.spellMax=rndInt(sp[0],sp[1]);}
  return best;
}
function bowlEngEndOver(M,I,idx,over){
  const b=I.eng.B[idx];
  b.used++;b.last=over;b.spell++;
  if(b.spell>=b.spellMax){
    b.active=false;b.spell=0;
    const sp=SPELLS[M.fmt][b.style]||[2,4,2,3];
    b.rest=over+rndInt(sp[2],sp[3])+1;
  }
  if(b.used>=b.max)b.active=false;
  I.eng.lastIdx=idx;
}

// ---------- your captaincy: bowler for the next over, next batter in ----------
// Bowlers you can call on: anyone in the XI but the keeper, not the last over's bowler, max 10 overs in an ODI.
function bowlerOptions(M){
  const I=curInn(M),x=M.xi[I.bowl],E=I.eng,last=E.lastIdx>=0?E.B[E.lastIdx].pid:0,over=Math.floor(I.lb/6)+1;
  const real=E.plan&&E.plan[over-1]||0;
  return x.bat.filter(p=>p!==x.wk).map(pid=>{
    const b=E.B.find(b=>b.pid===pid),W=I.bw[pid]||{b:0,r:0,w:0,md:0},a=pAttr(pid,M.date);
    const used=b?b.used:0,why=pid===last?'bowled the last over':M.fmt==='ODI'&&used>=10?'bowled out':'';
    return{pid,used,W,style:b?b.style:a.style==='N'?'M':a.style,rating:b?b.rating:a.style==='N'?6:a.rating,ok:!why,why,real:pid===real,regular:!!b};
  });
}
function captainBowler(M,I,over){
  const pid=M.nextBowler;M.nextBowler=null;
  if(!pid||!M.manualCaptain?.[I.bowl])return null;
  const opt=bowlerOptions(M).find(o=>o.pid===pid);
  if(!opt||!opt.ok)return null;
  const E=I.eng;let i=E.B.findIndex(b=>b.pid===pid);
  if(i<0){E.B.push({pid,style:opt.style,rating:opt.rating,max:M.fmt==='TEST'?999:10,used:0,last:0,spell:0,spellMax:0,rest:0,active:false});i=E.B.length-1;}
  const b=E.B[i];
  if(!b.active){b.active=true;b.spell=0;const sp=SPELLS[M.fmt][b.style]||[2,4,2,3];b.spellMax=rndInt(sp[0],sp[1]);}
  return i;
}
// Send in a different batter next: he moves to the front of those still to bat.
function setNextBatter(M,pid){
  const I=curInn(M),k=I.wkts+2,j=I.order.indexOf(pid);
  if(j<k||I.bt[pid])return false;
  I.order.splice(j,1);I.order.splice(k,0,pid);return true;
}

// ---------- situation shift (port of CalcSituationShift, plus Test match situations) ----------
function situationShift(M,I,over){
  let s=0;
  if(M.fmt==='ODI'){
    if(over>=M.maxOv-5)s+=2;else if(over>=M.maxOv-15)s+=1;
    if(I.no===2&&I.target>0){
      const left=M.maxOv-over+1,need=I.target-I.runs;
      if(left>0&&need>0){const rrr=need/left;s+=rrr>10?3:rrr>8?2:rrr>6.5?1:0;}
    }
  }else{
    const left=testOversLeft(M);
    if(I.no===4&&I.target>0){
      const need=I.target-I.runs,rrr=need/Math.max(1,left);
      if(rrr>4.2||(I.wkts>=5&&rrr>3))s-=1;
      else if(rrr>3.8)s+=1;
    }else if(I.no>=2){
      const lead=testTotals(M,I.bat)-testTotals(M,I.bowl);
      if(lead>=150&&left<=160)s+=lead>=250?2:1;
    }
  }
  if(I.wkts>=8)s-=1;
  // captains' attitude (you, when you captain a side): attack +1, defend -1, for the batting and the fielding side
  if(M.att)s+=(M.att[I.bat]||0)+(M.att['f'+I.bowl]||0);
  return clamp(s,-1,3);
}

// ---------- Test clock ----------
// Time is counted in overs: bowled + changeovers between innings + overs lost to the weather.
// Each new day rolls the weather (WEATHER_P chance of losing 8-60 overs, up to the whole day).
const WEATHER_P=.3;
function testBallsBowled(M){return sum(M.inns.map(i=>i.lb));}
function testClock(M){return testBallsBowled(M)/6+TEST_CHANGEOVER*M.inns.filter(i=>i.closed).length+(M.lost||0);}
function testOversLeft(M){return Math.max(0,TEST_OVERS-testClock(M));}
function testDay(M){return Math.min(5,Math.floor(testClock(M)/90)+1);}
function testSession(M){const o=testClock(M)%90;return o<30?1:o<60?2:3;}
function testWeather(M){
  if(M.fmt!=='TEST'||M.noWeather)return;
  const d=testDay(M);
  while((M.wxDay||0)<d){
    M.wxDay=(M.wxDay||0)+1;
    if(rnd()<WEATHER_P){
      const dayLeft=M.wxDay*90-testClock(M),lost=Math.min(Math.max(0,Math.floor(dayLeft)),rndInt(8,60));
      if(lost>0){M.lost=(M.lost||0)+lost;(M.wx=M.wx||{})[M.wxDay]=lost;fire(M,null,{t:'rain',day:M.wxDay,lost});}
    }
  }
}

// ---------- one delivery ----------
// Returns {need:'base'|'comp'} when manual dice are on and a roll is due; otherwise bowls and returns the ball.
function bowlBall(M,manualRoll){
  if(M.state!=='live'||M.pending)return null;
  const I=curInn(M);
  if(!M.cur){
    const over=Math.floor(I.lb/6)+1,bi=captainBowler(M,I,over)??chooseBowler(M,I,over),b=I.eng.B[bi];
    const card=pickCard(applyShift(wearWeights(M,b,baseWeights(M.fmt,b.rating)),situationShift(M,I,over)));
    M.cur={over,bi,bowler:b.pid,card,roll:0,col:1,comp:false,legal:0,n:0,runs:0};
    if(!I.bw[b.pid]){I.bw[b.pid]={b:0,r:0,w:0,md:0,wd:0,nb:0};I.bwOrder.push(b.pid);}
  }
  const C=M.cur;
  let roll,col;
  if(C.comp){
    if(M.manual&&manualRoll==null)return{need:'comp'};
    roll=manualRoll??roll100();col=1;C.comp=false;
  }else if(C.col<=6){
    if(!C.roll){if(M.manual&&manualRoll==null)return{need:'base'};C.roll=manualRoll??roll100();}
    roll=C.roll;col=C.col++;
  }else{
    if(M.manual&&manualRoll==null)return{need:'comp'};
    roll=manualRoll??roll100();col=1;
  }
  const tok=WORLD.cards[C.card][roll-1][col-1];
  const t=parseToken(tok);
  const striker=I.st,pos=I.order.indexOf(striker)+1;
  let voided=false;const bcol=batColour(M,striker,pos,I.bowl);
  if(t.w&&!wicketCounts(bcol,t.color)){voided=true;Object.assign(t,{w:false,color:'',how:'',bat:0,ex:0,exType:''});}
  const illegal=t.exType==='wd'||t.exType==='nb';
  const runs=t.bat+t.ex,B=I.bt[striker],W=I.bw[C.bowler];
  C.n++;
  I.runs+=runs;
  if(t.exType)I.ex[t.exType]+=t.ex;
  if(t.exType!=='wd')B.b++;
  B.r+=t.bat;if(t.bat===4)B.f4++;if(t.bat===6)B.f6++;
  const toBowler=t.bat+(illegal?t.ex:0);
  W.r+=toBowler;C.runs+=toBowler;
  if(t.exType==='wd')W.wd+=t.ex;
  if(t.exType==='nb')W.nb+=t.ex;
  const P=I.part;P.r+=runs;if(t.exType!=='wd')P.bl++;
  if(striker===P.a)P.ra+=t.bat;else P.rb+=t.bat;
  const ball={inn:I.no,over:C.over,n:C.n,legal:0,card:C.card,roll,col,tok,st:striker,ns:I.ns,bowler:C.bowler,
    bat:t.bat,ex:t.ex,exType:t.exType,w:0,how:'',fielder:0,out:0,runs:I.runs,wkts:I.wkts,voided,bcol,ev:[]};
  if(illegal){
    C.comp=true;
  }else{
    C.legal++;I.lb++;W.b++;ball.legal=C.legal;
    if(t.w){
      const credit=BOWLER_CREDIT[t.how];
      ball.w=1;ball.how=t.how;ball.out=striker;ball.fielder=pickFielder(M,I,t.how,C.bowler);
      B.out={how:t.how,bowler:credit?C.bowler:0,fielder:ball.fielder};
      I.wkts++;if(credit)W.w++;
      I.fow.push({w:I.wkts,r:I.runs,pid:striker,ov:oversTxt(I.lb)});
      closePartnership(I,true);
      trackHat(M,I,C.bowler,credit,ball);
      if(I.wkts<10){
        const nb=I.order[I.wkts+1];I.st=nb;I.bt[nb]=newBat(I.wkts+1);
        I.part={a:nb,b:I.ns,r:0,bl:0,ra:0,rb:0,w:I.wkts+1};
      }
    }else{
      trackHat(M,I,C.bowler,0,null);
      if(runs%2===1)[I.st,I.ns]=[I.ns,I.st];
    }
    if(C.legal===6)[I.st,I.ns]=[I.ns,I.st];
  }
  ball.runs=I.runs;ball.wkts=I.wkts;
  checkBatMilestones(M,I,striker,ball);
  if(W.w>=5&&!I.ms['5w'+C.bowler]){I.ms['5w'+C.bowler]=1;fire(M,ball,{t:'5w',pid:C.bowler,w:W.w,r:W.r});}
  I.balls.push(ball);
  // end of over / innings
  const inningsOver=checkInningsEnd(M,I);
  if(C.legal===6||inningsOver){
    if(C.legal===6&&C.runs===0)W.md++;
    endOverRecord(M,I);
  }
  if(!inningsOver&&!M.cur)testWeather(M);
  if(inningsOver)closeInnings(M,I,inningsOver);
  else if(!M.cur&&M.fmt==='TEST'&&!M.manualCaptain?.[I.bat]&&aiShouldDeclare(M,I))closeInnings(M,I,'declared');
  else if(!M.cur&&M.fmt==='TEST'&&testOversLeft(M)<=0)closeInnings(M,I,'time');
  return ball;
}
function endOverRecord(M,I){
  const C=M.cur;
  I.overs.push({over:C.over,bowler:C.bowler,runs:C.runs,w:I.balls.filter(b=>b.over===C.over&&b.w).length,card:C.card,roll:C.roll});
  bowlEngEndOver(M,I,C.bi,C.over);
  M.cur=null;
}
function pickFielder(M,I,how,bowler){
  const x=M.xi[I.bowl];
  if(how==='ctwk'||how==='st')return x.wk;
  if(how==='ct'&&rnd()<.15)return bowler;
  const pool=x.bat.filter(p=>p!==bowler&&(how==='ro'||p!==x.wk));
  return pick(pool);
}
function closePartnership(I,broken){
  const P=I.part;if(!P)return;
  I.parts.push({...P,broken});
  I.part=null;
}
function trackHat(M,I,bowler,wicket,ball){
  const h=I.hat[bowler]=I.hat[bowler]||0;
  if(!wicket){I.hat[bowler]=0;return;}
  I.hat[bowler]=h+1;
  if(I.hat[bowler]===3)fire(M,ball,{t:'hat',pid:bowler});
}
function fire(M,ball,e){e.inn=curInn(M).no;e.over=ball?oversTxt(curInn(M).lb):'';M.events.push(e);if(ball)ball.ev.push(e);if(typeof onMatchEvent==='function')onMatchEvent(M,e);}
function checkBatMilestones(M,I,pid,ball){
  const B=I.bt[pid];
  if(B.r>=50&&!B.fifty){B.fifty=B.b;fire(M,ball,{t:'50',pid,balls:B.b});}
  if(B.r>=100&&!B.hundred){B.hundred=B.b;fire(M,ball,{t:'100',pid,balls:B.b});}
  if(B.r>=200&&!B.double){B.double=B.b;fire(M,ball,{t:'200',pid,balls:B.b});}
}
function checkInningsEnd(M,I){
  if(I.wkts>=10)return'all out';
  if(I.target&&I.runs>=I.target)return'target';
  if(M.fmt==='ODI'&&I.lb>=M.maxOv*6)return'overs';
  if(M.fmt==='TEST'&&testOversLeft(M)<=0)return'time';
  return'';
}

// ---------- innings & match flow ----------
function closeInnings(M,I,why){
  if(I.closed)return;
  if(M.cur)endOverRecord(M,I);
  I.closed=true;I.why=why;
  if(I.part)closePartnership(I,false);
  fire(M,null,{t:'innsEnd',no:I.no,bat:I.bat,runs:I.runs,wkts:I.wkts,why});
  nextPhase(M);
}
function nextPhase(M){
  const n=M.inns.length,I=curInn(M);
  if(M.fmt==='ODI'){
    if(n===1)return startInnings(M,I.bowl);
    return finishMatch(M);
  }
  if(I.why==='time')return finishMatch(M);
  const noTime=testOversLeft(M)<=0;
  if(n===1)return noTime?finishMatch(M):startInnings(M,I.bowl);
  if(n===2){
    const A=M.inns[0].bat,lead=M.inns[0].runs-M.inns[1].runs;
    if(lead>=FOLLOW_ON){
      if(M.manualCaptain?.[A]){M.pending={type:'followon',team:A,lead};return;}
      return decideFollowOn(M,aiFollowOn(M,lead));
    }
    return noTime?finishMatch(M):startInnings(M,A);
  }
  if(n===3){
    const X=I.bat,Y=I.bowl;
    if(testTotals(M,X)<testTotals(M,Y)||noTime)return finishMatch(M);
    return startInnings(M,Y);
  }
  return finishMatch(M);
}
function aiFollowOn(M,lead){return lead>=250||testOversLeft(M)<270||rnd()<.5;}
function decideFollowOn(M,enforce){
  M.pending=null;
  const A=M.inns[0].bat,B=M.inns[1].bat;
  M.followOn=!!enforce;
  if(enforce)fire(M,null,{t:'followon',team:A});
  if(testOversLeft(M)<=0)return finishMatch(M);
  startInnings(M,enforce?B:A);
}
// AI declarations: first innings on a huge score; third innings once the lead is big enough for the time left.
function aiShouldDeclare(M,I){
  const left=testOversLeft(M),lead=testTotals(M,I.bat)-testTotals(M,I.bowl);
  if(I.no===1)return I.runs>=600||(I.runs>=520&&I.wkts>=6);
  if(I.no===2)return lead>=250&&left<260;
  if(I.no===3&&!M.followOn){
    if(left<35)return false;
    return lead>=450||(lead>=320&&left<=150)||(lead>=250&&left<=110)||(lead>=190&&left<=70);
  }
  return false;
}
function declare(M){
  const I=curInn(M);
  if(M.fmt!=='TEST'||M.state!=='live'||I.no===4||I.closed)return false;
  closeInnings(M,I,'declared');return true;
}
function finishMatch(M){
  M.state='done';M.cur=null;
  const r={winner:0,type:'',margin:0,text:''};
  const nm=t=>teamName(t);
  if(M.fmt==='ODI'){
    const [i1,i2]=M.inns;
    if(!i2){r.type='nr';r.text='No result';}
    else if(i2.runs>=i2.target){r.winner=i2.bat;r.type='wkts';r.margin=10-i2.wkts;
      const left=M.maxOv*6-i2.lb;r.text=`${nm(i2.bat)} won by ${plural(r.margin,'wicket')}`+(left>0?` (${plural(left,'ball')} left)`:'');}
    else if(i2.runs===i1.runs){r.type='tie';r.text='Match tied';}
    else{r.winner=i1.bat;r.type='runs';r.margin=i1.runs-i2.runs;r.text=`${nm(i1.bat)} won by ${plural(r.margin,'run')}`;}
  }else{
    const n=M.inns.length,I=curInn(M);
    if(n===3&&I.closed&&I.why!=='time'&&testTotals(M,I.bat)<testTotals(M,I.bowl)){
      r.winner=I.bowl;r.type='inns';r.margin=testTotals(M,I.bowl)-testTotals(M,I.bat);
      r.text=`${nm(I.bowl)} won by an innings and ${plural(r.margin,'run')}`;
    }else if(n===4&&I.target&&I.runs>=I.target){
      r.winner=I.bat;r.type='wkts';r.margin=10-I.wkts;r.text=`${nm(I.bat)} won by ${plural(r.margin,'wicket')}`;
    }else if(n===4&&I.why==='all out'){
      const diff=testTotals(M,I.bowl)-testTotals(M,I.bat);
      if(diff===0){r.type='tie';r.text='Match tied';}
      else{r.winner=I.bowl;r.type='runs';r.margin=diff;r.text=`${nm(I.bowl)} won by ${plural(diff,'run')}`;}
    }else{r.type='draw';r.text='Match drawn';}
  }
  M.result=r;
  fire(M,null,{t:'result',text:r.text});
  if(typeof onMatchDone==='function')onMatchDone(M);
}
// Fast-forward helpers (auto dice only)
function bowlOver(M){if(!M.cur&&M.state==='live'){bowlBall(M);}while(M.cur&&M.state==='live'&&!M.pending){const r=bowlBall(M);if(!r||r.need)return r;}return true;}
function simInnings(M){const n=M.inns.length;let g=0;while(M.state==='live'&&!M.pending&&M.inns.length===n&&g++<20000){const r=bowlBall(M);if(!r||r.need)return r;}return true;}
function simMatch(M){let g=0;while(M.state==='live'&&g++<40000){if(M.pending){if(M.pending.type==='followon')decideFollowOn(M,aiFollowOn(M,M.pending.lead));continue;}const r=bowlBall(M);if(!r||r.need)return r;}return true;}
