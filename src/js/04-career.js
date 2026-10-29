// ═══ CAREER — state, match archive, career stats, man of the match, milestones ═══
// S is the whole saved game. Persistent state must be listed in SAVE_KEYS (see 06-save.js).
let S=null;
function newCareer(opts={}){
  return{
    v:1,created:Date.now(),name:opts.name||'My career',
    settings:{dice:'auto',captain:'auto',knockouts:'timeline',batColours:'player',ratings:'era',history:'after',selection:'auto',form:'on',broadcast:'standard',font:'barlow',voice:false,voiceRate:1.05,future:'on',myTeam:+opts.myTeam||0,ballDelay:250,sound:false,tv:true},
    done:{},          // fixture no / test id -> match id
    matches:[],       // archived scorecards (compact), oldest first
    logs:{},          // match id -> compact ball log, last LOG_KEEP matches only
    live:null,        // match in progress
    stats:perFmt(()=>({})),teams:perFmt(()=>({})),
    ms:[],msKeys:{},fast:perFmt(()=>({f50:null,f100:null})),
    tests:[],testSeq:0,cups:[],cupSeq:0,attrEdits:{},seen:{},reseed:{},rk:blankRankings(),
  };
}
const LOG_KEEP=25;

// ---------- archive ----------
const HOW_TXT={b:'b',lbw:'lbw',ct:'c',ctof:'c',ctwk:'c',st:'st',ro:'run out'};
function archiveMatch(M){
  const E={id:M.id,fmt:M.fmt,fid:M.fid,sid:M.sid,series:M.series,stage:M.stage,date:M.date,venue:M.venue,city:M.city,
    teams:M.teams,toss:[M.toss.w,M.toss.choice],result:M.result,followOn:M.followOn||false,pitch:M.pitch||'',wx:M.wx||null,
    maxOv:M.maxOv,dl:M.dl&&M.dl.target?{target:M.dl.target,overs:M.inns[1]&&M.inns[1].maxOv}:null,abandoned:M.abandoned||false,
    so:M.superOver?{w:M.superOver.winner,b:M.superOver.byBoundaries,r:M.superOver.rounds.map(rd=>rd.map(x=>[x.bat,x.runs,x.wkts,x.bowler,x.balls.join(' ')]))}:null,
    xi:Object.fromEntries(M.teams.map(t=>[t,[...M.xi[t].bat,M.xi[t].wk,M.xi[t].cap]])),reseeded:M.reseeded||false,
    inns:M.inns.map(I=>({bat:I.bat,bowl:I.bowl,runs:I.runs,wkts:I.wkts,lb:I.lb,why:I.why,target:I.target,mo:I.maxOv,
      ex:[I.ex.b,I.ex.lb,I.ex.wd,I.ex.nb],
      bt:Object.entries(I.bt).sort((a,b)=>a[1].idx-b[1].idx).map(([p,B])=>[+p,B.r,B.b,B.f4,B.f6,B.out?B.out.how:'',B.out?B.out.bowler:0,B.out?B.out.fielder:0,B.fifty||0,B.hundred||0]),
      bw:I.bwOrder.map(p=>{const W=I.bw[p];return[p,W.b,W.md,W.r,W.w,W.wd,W.nb];}),
      fow:I.fow.map(f=>[f.w,f.r,f.pid,f.ov]),
      parts:I.parts.map(p=>[p.a,p.b,p.r,p.bl,p.w,p.broken?1:0,p.ra,p.rb]),
      ov:I.overs.map(o=>[o.runs,o.w]),
      mu:matchups(I)})),
    ev:M.events.filter(e=>['50','100','200','5w','hat'].includes(e.t)).map(e=>[e.t,e.pid,e.inn,e.balls||e.w||0]),
  };
  E.motm=pickMOTM(E);
  return E;
}
// Batter v bowler in an innings: [[batter, bowler, balls faced, runs, dismissed by him]]
function matchups(I){
  const m=new Map();
  for(const b of I.balls){
    const k=b.st+':'+b.bowler,x=m.get(k)||[b.st,b.bowler,0,0,0];
    if(b.exType!=='wd')x[2]++;x[3]+=b.bat;if(b.w&&BOWLER_CREDIT[b.how])x[4]++;
    m.set(k,x);
  }
  return[...m.values()];
}
function packBalls(M){return M.inns.map(I=>I.balls.map(b=>[b.over,b.legal,b.card,b.roll,b.col,b.tok,b.st,b.bowler,b.runs,b.wkts,b.w?b.how:'',b.voided?1:0]));}

// ---------- man of the match (port of modMOTM) ----------
// Batting runs×SR/100 + bowling wkts×25 + maidens×10 − econ×3 + fielding (ct 10, st 15, ro 12)
// + 50/100/5-for bonuses (15/30/40), ×1.25 for the winning side.
function playerMatchLines(E){
  const P={};
  const g=(pid,team)=>P[pid]=P[pid]||{pid,team,r:0,b:0,bat:0,hs:0,w:0,bb:0,br:0,md:0,ct:0,st:0,ro:0,c50:0,c100:0,w5:0};
  for(const t of E.teams)E.xi[t].slice(0,11).forEach(p=>g(p,t));
  for(const I of E.inns){
    for(const r of I.bt){const L=g(r[0],I.bat);L.r+=r[1];L.b+=r[2];L.bat++;if(r[1]>=100)L.c100++;else if(r[1]>=50)L.c50++;
      if(r[5]){const f=r[7];if(f&&(r[5]==='ct'||r[5]==='ctof'||r[5]==='ctwk'))g(f,I.bowl).ct++;if(f&&r[5]==='st')g(f,I.bowl).st++;if(f&&r[5]==='ro')g(f,I.bowl).ro++;}}
    for(const w of I.bw){const L=g(w[0],I.bowl);L.bb+=w[1];L.md+=w[2];L.br+=w[3];L.w+=w[4];if(w[4]>=5)L.w5++;}
  }
  return P;
}
function pickMOTM(E){
  if(!E.result||E.result.type==='nr')return 0;
  let best=0,bs=-1e9;
  for(const L of Object.values(playerMatchLines(E))){
    let s=L.b>0?L.r*(L.r/L.b):L.r;
    s+=L.w*25+L.md*10;
    if(L.bb>0)s-=(L.br/(L.bb/6))*3;
    s+=L.ct*10+L.st*15+L.ro*12;
    s+=L.c100*30+L.c50*15+L.w5*40;
    if(E.result.winner&&L.team===E.result.winner)s*=1.25;
    if(s>bs){bs=s;best=L.pid;}
  }
  return best;
}

// ---------- career stats ----------
function blankStats(){return{m:0,inn:0,no:0,r:0,b:0,hs:0,hsNo:0,f4:0,f6:0,c50:0,c100:0,c200:0,d0:0,
  bb:0,br:0,bw:0,md:0,w5:0,w10:0,best:[0,0],ct:0,st:0,ro:0,motm:0,cm:0,cw:0,cl:0,cd:0,teams:[],last:'',first:''};}
function applyStats(E){
  const ST=S.stats[E.fmt],L=playerMatchLines(E);
  const g=pid=>ST[pid]=ST[pid]||blankStats();
  for(const t of E.teams){
    const T=S.teams[E.fmt][t]=S.teams[E.fmt][t]||{p:0,w:0,l:0,t:0,d:0,nr:0};
    T.p++;const r=E.result;
    if(r.type==='tie')T.t++;else if(r.type==='draw')T.d++;else if(r.type==='nr')T.nr++;else if(r.winner===t)T.w++;else T.l++;
    for(const pid of E.xi[t].slice(0,11)){
      const s=g(pid);s.m++;if(!s.teams.includes(t))s.teams.push(t);s.last=E.date;if(!s.first)s.first=E.date;
    }
    const cap=E.xi[t][12];const c=g(cap);c.cm++;
    if(r.type==='draw'||r.type==='tie'||r.type==='nr')c.cd++;else if(r.winner===t)c.cw++;else c.cl++;
  }
  for(const I of E.inns)for(const r of I.bt){
    const s=g(r[0]);s.inn++;s.r+=r[1];s.b+=r[2];s.f4+=r[3];s.f6+=r[4];
    const notOut=!r[5];if(notOut)s.no++;
    if(r[1]>s.hs||(r[1]===s.hs&&notOut)){s.hs=r[1];s.hsNo=notOut?1:0;}
    if(r[1]>=200)s.c200++;if(r[1]>=100)s.c100++;else if(r[1]>=50)s.c50++;
    if(r[1]===0&&!notOut)s.d0++;
  }
  for(const pid in L){
    const l=L[pid],s=g(pid);
    s.ct+=l.ct;s.st+=l.st;s.ro+=l.ro;
  }
  for(const I of E.inns)for(const w of I.bw){
    const s=g(w[0]);s.bb+=w[1];s.md+=w[2];s.br+=w[3];s.bw+=w[4];if(w[4]>=5)s.w5++;
    if(w[4]>s.best[0]||(w[4]===s.best[0]&&w[3]<s.best[1]))s.best=[w[4],w[3]];
  }
  if(E.fmt==='TEST')for(const pid in L)if(L[pid].w>=10)g(pid).w10++;
  if(E.motm)g(E.motm).motm++;
}
function rebuildStats(){
  S.stats=perFmt(()=>({}));S.teams=perFmt(()=>({}));
  S.form=perFmt(()=>({}));
  for(const E of S.matches){applyStats(E);updateForm(E);}
  rebuildRankings();
}
const batAvg=s=>s.inn-s.no>0?s.r/(s.inn-s.no):NaN;
const batSR=s=>s.b?100*s.r/s.b:NaN;
const bowlAvg=s=>s.bw?s.br/s.bw:NaN;
const bowlEcon=s=>s.bb?s.br/(s.bb/6):NaN;
const bowlSR=s=>s.bw?s.bb/s.bw:NaN;

// ---------- milestones (port of modMilestones; logged live for fastest 50/100 and hat-tricks) ----------
const MS_DEFS=[
  {cat:'Career Runs',key:s=>s.r,thr:[1000,2000,3000,5000,7500,10000,12500,15000],txt:t=>t.toLocaleString()+' career runs'},
  {cat:'Centuries',key:s=>s.c100,thr:[1,10,20,30,40],txt:t=>t===1?'Maiden century':t+' career centuries'},
  {cat:'Career Wickets',key:s=>s.bw,thr:[50,100,150,200,300,400,500],txt:t=>t+' career wickets'},
  {cat:'Five-wicket hauls',key:s=>s.w5,thr:[1,5,10,20],txt:t=>t===1?'First five-wicket haul':t+' five-wicket hauls'},
  {cat:'Career Catches',key:s=>s.ct,thr:[25,50,75,100,150],txt:t=>t+' career catches'},
  {cat:'Caps',key:s=>s.m,thr:[50,100,150,200],txt:t=>t+' caps'},
  {cat:'All-rounder',key:s=>s.r>=1000&&s.bw>=50?1:0,thr:[1],txt:()=>'The double: 1,000 runs and 50 wickets'},
];
function logMilestone(fmt,pid,cat,thr,E,text,extra){
  const k=fmt+':'+(+pid)+':'+cat+':'+thr;
  if(S.msKeys[k])return null;
  S.msKeys[k]=1;
  const m={fmt,pid:+pid,cat,thr,mid:E?E.id:'',date:E?E.date:'',text,team:extra?.team||0};
  S.ms.push(m);return m;
}
function checkMilestones(E){
  const out=[],ST=S.stats[E.fmt];
  for(const t of E.teams)for(const pid of E.xi[t].slice(0,11)){
    const s=ST[pid];if(!s)continue;
    for(const d of MS_DEFS){const v=d.key(s);for(const thr of d.thr)if(v>=thr){const m=logMilestone(E.fmt,pid,d.cat,thr,E,d.txt(thr),{team:t});if(m)out.push(m);}}
  }
  for(const e of E.ev)if(e[0]==='hat'){const m=logMilestone(E.fmt,e[1],'Hat-trick',E.id,E,'Hat-trick!');if(m)out.push(m);}
  return out;
}
// Fastest 50/100: checked the moment the batter gets there, against the record as it stood.
function liveFastest(M,e){
  if(!S||(e.t!=='50'&&e.t!=='100'))return null;
  const key=e.t==='50'?'f50':'f100',F=S.fast[M.fmt],cur=F[key];
  if(cur&&cur.balls<=e.balls)return null;
  F[key]={pid:e.pid,balls:e.balls,mid:M.id,date:M.date};
  // the first one sets the benchmark quietly, and records only start to count after 10 matches in the format
  if(!cur||S.matches.filter(m=>m.fmt===M.fmt).length<10)return null;
  const m=logMilestone(M.fmt,e.pid,'Fastest '+e.t,M.id+':'+e.balls,{id:M.id,date:M.date},`Fastest ${e.t} on record: ${e.balls} balls`);
  return m;
}
