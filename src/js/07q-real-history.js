// ═══ REAL HISTORY — the years before a later start, filled in from the real scorecards ═══
// tools/cricsheet_cards.py rebuilds every real ODI, Test and T20I (T20 World Cups too) from Cricsheet's ball-by-ball
// data into data/hist.json.gz; the build embeds it as base64 (HIST_GZ). It's unpacked only when a career starts
// later with "real results" (prefillTo): each real match then goes through recordMatch like a played one, so stats,
// records, rankings, milestones, awards and the WTC table are the real ones. Real matches carry E.real = 1 and no
// ball log (no ball-by-ball view, no batter-v-bowler head-to-heads). S.realTo = the date the real history runs to.
let HIST=null;
const histAvailable=()=>!!HIST_GZ&&typeof DecompressionStream!=='undefined';
async function loadHist(){
  if(HIST)return HIST;
  if(!histAvailable())return null;
  try{
    const bin=atob(HIST_GZ),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    HIST=JSON.parse(await gunz(bytes));
  }catch(e){HIST=null;}
  return HIST;
}
const histCard=fx=>HIST&&fx&&fx.real!==false&&fx.f&&fx.f.cid?HIST[fx.f.cid]||null:null;
// The archived match (the shape archiveMatch makes) for a real fixture.
function realE(fx){
  const H=histCard(fx);if(!H)return null;
  const fmt=fx.fmt,cid=fx.f.cid,xi={};
  for(const t of[fx.a,fx.b])xi[t]=fmt==='ODI'?fixtureXI(cid,t):testXI(cid,t,fx.date);
  if(!xi[fx.a]||!xi[fx.b])return null;
  const other=t=>t===fx.a?fx.b:fx.a,P=(t,i)=>i>=0?xi[t].bat[i]||0:0,nm=t=>teamName(t);
  const inns=H.i.map((I,k)=>{
    const[bat,runs,wkts,lb,why,ex,bt,bw,fow,parts,ov,target,mo]=I,bowl=other(bat);
    const wOver={};fow.forEach(f=>{const o=Math.max(0,Math.ceil(f[2]/6)-1);wOver[o]=(wOver[o]||0)+1;});
    return{bat,bowl,runs,wkts,lb,why,target,mo:mo||undefined,ex,
      bt:bt.map(b=>[P(bat,b[0]),b[1],b[2],b[3],b[4],b[5],P(bowl,b[6]),P(bowl,b[7]),b[8],b[9]]).filter(b=>b[0]),
      bw:bw.map(b=>[P(bowl,b[0]),...b.slice(1)]).filter(b=>b[0]),
      fow:fow.map((f,j)=>[j+1,f[0],P(bat,f[1]),oversTxt(f[2])]),
      parts:parts.map(p=>[P(bat,p[0]),P(bat,p[1]),...p.slice(2)]),
      ov:[...ov].map((c,o)=>[c.charCodeAt(0)-48,wOver[o]||0]),mu:[]};
  });
  // the result, worded as the game words its own
  const[w,type,margin,method]=H.r,dl=method?' (D/L method)':'',last=inns[inns.length-1];
  const r={winner:w,type,margin,text:''};
  if(type==='wkts'){const left=last&&last.mo?last.mo*6-last.lb:0;r.text=`${nm(w)} won by ${plural(margin,'wicket')}`+(fmt!=='TEST'&&left>0?` (${plural(left,'ball')} left)`:'')+dl;}
  else if(type==='runs')r.text=margin?`${nm(w)} won by ${plural(margin,'run')}`+dl:`${nm(w)} won`;
  else if(type==='inns')r.text=`${nm(w)} won by an innings and ${plural(margin,'run')}`;
  else if(type==='draw')r.text='Match drawn';
  else if(type==='tie'&&H.so){r.type='so';r.winner=H.so;r.text=`Match tied - ${nm(H.so)} won the super over`;}
  else if(type==='tie')r.text='Match tied'+dl;
  else{r.type='nr';r.winner=0;r.text='No result';}
  let stage=fx.stage||'';
  if(fmt==='ODI'){const Ed=edition(fx.sid);stage=Ed?stageName(Ed.stageOf.get(fx.f.no),Ed):'';}
  else if(!stage&&fmt==='TEST')stage=fx.label;
  const E={id:'h'+cid,fmt,fid:fmt==='ODI'?fx.f.no:null,sid:fx.sid,series:fx.title,stage,date:fx.date,venue:fx.venue,city:fx.city,
    teams:[fx.a,fx.b],toss:H.t,result:r,followOn:!!H.fo,pitch:'',wx:null,maxOv:fmt==='ODI'?50:fmt==='T20'?20:undefined,
    dl:method&&inns[1]?{target:inns[1].target,overs:inns[1].mo}:null,abandoned:r.type==='nr'&&!inns.length,
    so:r.type==='so'?{w:H.so,b:false,r:[]}:null,
    xi:Object.fromEntries([fx.a,fx.b].map(t=>[t,[...xi[t].bat,xi[t].wk,xi[t].cap]])),reseeded:false,inns,
    ev:inns.flatMap((I,k)=>[...I.bt.flatMap(b=>[b[8]?['50',b[0],k,b[8]]:null,b[9]?['100',b[0],k,b[9]]:null]),
      ...I.bw.filter(b=>b[4]>=5).map(b=>['5w',b[0],k,b[4]])].filter(Boolean)),real:1};
  const inXI=p=>E.teams.some(t=>E.xi[t].slice(0,11).includes(p));
  E.motm=H.pom&&inXI(H.pom)&&r.type!=='nr'?H.pom:pickMOTM(E);
  return E;
}
// Record a real match as if it had been played (from prefillTo).
function recordReal(fx){
  const E=realE(fx);if(!E)return null;
  recordMatch(E,{id:E.id,key:fx.key,sim:true,real:true});
  return E;
}
