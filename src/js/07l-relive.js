// ═══ RELIVE — famous real ODIs from their real positions ═══
// Needs tools/cricsheet_odis.py: WORLD.real[cid].pos = [[ballsLeft, need, wktsDown, aPid, aRuns, aBalls, bPid, bRuns, bBalls]]
// at the start of the chase and of its last ten overs, for close finishes, ties, big chases and knockouts (.fam).
// A moment becomes a challenge (kind chase or defend) with the real XIs, venue, first innings and men at the crease.
const FAM_NAME={close:'Close finish',tie:'Tie',big:'Big chase',ko:'Knockout'};
function famousMatches(){
  if(!HAS_REAL)return[];
  return FIX.filter(f=>{const R=WORLD.real[f.cid];return R&&R.pos&&R.pos.length&&R.inn.length===2&&WORLD.xi[f.cid];}).map(f=>({f,R:WORLD.real[f.cid]}));
}
// The start of the chase, then the snapshots nearest 10, 5, 2 and 1 overs left.
function reliveMoments(R){
  const out=[],seen=new Set(),add=p=>{if(p&&!seen.has(p[0])&&p[1]>0&&p[2]<10){seen.add(p[0]);out.push(p);}};
  add(R.pos[0]);
  for(const bl of[60,30,12,6])add(R.pos.filter(x=>x[0]<=bl).sort((a,b)=>b[0]-a[0])[0]);
  return out;
}
function reliveDef(f,R,p,kind){
  const bat=R.inn[1][0],bowl=R.inn[0][0],target=R.pos[0][1],maxBalls=R.pos[0][0],start=p[0]===maxBalls;
  const ov=b=>`${Math.floor(b/6)}${b%6?'.'+b%6:''}`;
  return{id:`rl-${f.cid}-${p[0]}-${kind}`,title:`${teamShort(bat)} v ${teamShort(bowl)} ${f.date.slice(0,4)}${start?'':' · '+ov(p[0])+' overs left'}`,
    desc:start?`${teamName(bat)} chase ${target} against ${teamName(bowl)}.`:`${teamName(bat)} need ${p[1]} off ${plural(p[0],'ball')} with ${plural(10-p[2],'wicket')} left against ${teamName(bowl)}.`,
    kind,fmt:'ODI',bat,bowl,date:f.date,target,need:p[1],balls:p[0],wkts:p[2],cid:f.cid,crease:start?null:p.slice(3),
    first:[R.inn[0][2],R.inn[0][3]],maxOv:Math.ceil(maxBalls/6),stage:/semi/i.test(R.ev||'')?'Semi-final':/quarter/i.test(R.ev||'')?'Quarter-final':/final/i.test(R.ev||'')?'Final':'',real:1};
}
// Put the real pair at the crease (and the men out before them) before the innings is faked around them.
function reliveOrder(I,c,wkts){
  const[a,,,b]=c;if(!I.order.includes(a)||!I.order.includes(b))return false;
  const rest=I.order.filter(p=>p!==a&&p!==b);I.order=[...rest.slice(0,wkts),a,b,...rest.slice(wkts)];return true;
}
function reliveCrease(I,c){
  const[a,ar,ab,b,br,bb]=c;
  for(const[p,r,n]of[[a,ar,ab],[b,br,bb]])if(I.bt[p])Object.assign(I.bt[p],{r,b:n,f4:Math.min(I.bt[p].f4,Math.floor(r/4)),f6:0});
  I.st=a;I.ns=b;I.part={a,b,r:0,bl:0,ra:0,rb:0,w:I.wkts+1};
  const sumBat=()=>Object.values(I.bt).reduce((s,x)=>s+x.r,0),fixed=I.ex.b+I.ex.wd+I.ex.nb;
  for(const p of Object.keys(I.bt).map(Number).filter(p=>p!==a&&p!==b).sort((x,y)=>I.bt[y].r-I.bt[x].r)){
    const over=sumBat()+fixed-I.runs;if(over<=0)break;const B=I.bt[p],cut=Math.min(B.r,over);B.r-=cut;B.f4=Math.min(B.f4,Math.floor(B.r/4));B.f6=Math.min(B.f6,Math.floor(B.r/6));
  }
  I.ex.lb=Math.max(0,I.runs-sumBat()-fixed);
}
const reliveReal=def=>def&&def.cid&&HAS_REAL&&WORLD.real[def.cid]?realText(WORLD.real[def.cid]):'';
// ---------- any real ODI or T20I chase, from the start of any over (needs the real scorecards, 07q) ----------
// The position at the start of over k of the chase comes from the scorecard: runs from the over-by-over line, wickets
// from the fall of wickets, the pair at the crease from the partnerships (their scores exact at each wicket, shared
// out in proportion within a stand).
const realRow=(cid,tid)=>((WORLD.xi[cid])||(WORLD.t20xi&&WORLD.t20xi[cid])||{})[tid]||null;
function chaseAt(H,cid,k){
  const I1=H.i[0],I2=H.i[1];if(!I1||!I2)return null;
  const bat=I2[0],row=realRow(cid,bat);if(!row)return null;
  const target=I2[11]||I1[1]+1,maxBalls=(I2[12]||I1[12]||50)*6,ov=I2[10],fow=I2[8],parts=I2[9];
  let runs=0;for(let o=0;o<k;o++)runs+=ov.charCodeAt(o)-48;
  const lb=6*k,wk=fow.filter(f=>f[2]<=lb).length;
  if(k>=ov.length||wk>=10||runs>=target)return null;
  const P=parts[wk];if(!P)return null;
  const s0=wk?fow[wk-1][0]:0,b0=wk?fow[wk-1][2]:0,fr=P[2]?clamp((runs-s0)/P[2],0,1):0,fb=P[3]?clamp((lb-b0)/P[3],0,1):0;
  const before=i=>parts.slice(0,wk).reduce((a,q)=>a+(q[0]===i?q[6]:q[1]===i?q[7]:0),0);
  const bt=i=>I2[6].find(b=>b[0]===i);
  const man=(i,share)=>{const r=before(i)+Math.round(share*fr),B=bt(i);return[row[i]||0,r,B&&B[1]?Math.round(B[2]*r/B[1]):Math.round(fb*(P[3]/2))];};
  if(P[0]<0||P[1]<0)return null;
  return[maxBalls-lb,target-runs,wk,...man(P[0],P[6]),...man(P[1],P[7])];
}
function reliveAnyDef(fx,H,k,kind){
  const p=chaseAt(H,fx.f.cid,k);if(!p)return null;
  const I1=H.i[0],I2=H.i[1],bat=I2[0],bowl=I1[0],fmt=fx.fmt,target=I2[11]||I1[1]+1,maxBalls=p[0]+6*k;
  return{id:`ra-${fx.f.cid}-${k}-${kind}`,title:`${teamShort(bat)} v ${teamShort(bowl)} ${fx.date.slice(0,4)}${k?' · from over '+(k+1):''}`,
    desc:k?`${teamName(bat)} need ${p[1]} off ${plural(p[0],'ball')} with ${plural(10-p[2],'wicket')} left against ${teamName(bowl)}.`:`${teamName(bat)} chase ${target} against ${teamName(bowl)}.`,
    kind,fmt,bat,bowl,date:fx.date,target,need:p[1],balls:p[0],wkts:p[2],cid:fx.f.cid,crease:k?p.slice(3):null,
    first:[I1[2],I1[3]],maxOv:Math.ceil(maxBalls/6),stage:fx.stage&&/final|semi|quarter/i.test(fx.stage)?fx.stage:(fx.fmt==='ODI'?(()=>{const Ed=edition(fx.sid);return Ed?stageName(Ed.stageOf.get(fx.f.no),Ed):'';})():''),real:1};
}
// Every real ODI and T20I with a chase, newest first.
function reliveAnyList(){
  if(!HIST)return[];
  return[...ODI_FX.filter(x=>x.playable),...REAL_T20_FX].filter(x=>{const H=HIST[x.f.cid];return H&&H.i.length===2&&H.i[1][10].length>0;})
    .sort((a,b)=>a.date<b.date?1:-1);
}
