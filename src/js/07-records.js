// ═══ RECORDS — computed from career stats and the match archive (top 10 per record) ═══
const REC_MIN={ODI:{inn:20,balls:500,wkts:30,bb:600,cap:10},TEST:{inn:15,balls:1000,wkts:30,bb:1500,cap:8},T20:{inn:12,balls:250,wkts:20,bb:300,cap:8}};
const REC_GROUPS=[
  ['Batting',['runs','hs','avg','sr','c100','c50','f6','f4','fast50','fast100','ducks']],
  ['Bowling',['wkts','bbi','bbm','bavg','econ','bsr','w5','md']],
  ['Fielding',['ct','wkd','st','ro']],
  ['Captaincy',['capw','cappct']],
  ['Partnerships',['part','p1','p2','p3','p4','p5','p6','p7','p8','p9','p10']],
  ['Team',['tot','low','winr','winw','teamwl']],
  ['Awards',['motm','caps']],
];
const REC_NAME={runs:'Most runs',hs:'Highest individual score',avg:'Highest batting average',sr:'Highest strike rate',c100:'Most hundreds',c50:'Most fifties',
  f6:'Most sixes',f4:'Most fours',fast50:'Fastest fifty',fast100:'Fastest hundred',ducks:'Most ducks',wkts:'Most wickets',bbi:'Best bowling in an innings',
  bbm:'Best bowling in a match',bavg:'Best bowling average',econ:'Best economy rate',bsr:'Best bowling strike rate',w5:'Most five-wicket hauls',md:'Most maidens',
  ct:'Most catches (fielder)',wkd:'Most wicketkeeping dismissals',st:'Most stumpings',ro:'Most run outs',capw:'Most wins as captain',cappct:'Best win % as captain',
  part:'Highest partnership (any wicket)',tot:'Highest team totals',low:'Lowest completed totals',winr:'Biggest wins by runs',winw:'Biggest wins by wickets',
  teamwl:'Team results',motm:'Most Man of the Match awards',caps:'Most caps'};
for(let w=1;w<=10;w++)REC_NAME['p'+w]=`Highest ${ordinal(w)}-wicket partnership`;

let REC_CACHE=null;
function recordsData(fmt){
  const key=fmt+':'+S.matches.length;
  if(REC_CACHE&&REC_CACHE.key===key&&REC_CACHE.S===S)return REC_CACHE.data;
  const ST=S.stats[fmt],min=REC_MIN[fmt],P=Object.entries(ST).map(([pid,s])=>({pid:+pid,s}));
  const team=s=>s.teams.map(teamShort).join('/');
  const top=(arr,val,fmtv,dir=-1,filter=()=>true)=>arr.filter(x=>filter(x)&&isFinite(val(x))).sort((a,b)=>dir*(val(a)-val(b))||0).slice(0,10)
    .map(x=>({pid:x.pid,v:val(x),txt:fmtv(x),team:team(x.s)}));
  const D={};
  D.runs=top(P,x=>x.s.r,x=>x.s.r.toLocaleString());
  D.hs=top(P,x=>x.s.hs+(x.s.hsNo?.5:0),x=>x.s.hs+(x.s.hsNo?'*':''));
  D.avg=top(P,x=>batAvg(x.s),x=>f2(batAvg(x.s)),-1,x=>x.s.inn>=min.inn);
  D.sr=top(P,x=>batSR(x.s),x=>f2(batSR(x.s)),-1,x=>x.s.b>=min.balls);
  D.c100=top(P,x=>x.s.c100,x=>x.s.c100,-1,x=>x.s.c100>0);
  D.c50=top(P,x=>x.s.c50,x=>x.s.c50,-1,x=>x.s.c50>0);
  D.f6=top(P,x=>x.s.f6,x=>x.s.f6,-1,x=>x.s.f6>0);
  D.f4=top(P,x=>x.s.f4,x=>x.s.f4,-1,x=>x.s.f4>0);
  D.ducks=top(P,x=>x.s.d0,x=>x.s.d0,-1,x=>x.s.d0>0);
  D.wkts=top(P,x=>x.s.bw,x=>x.s.bw,-1,x=>x.s.bw>0);
  D.bbi=top(P,x=>x.s.best[0]*1000-x.s.best[1],x=>x.s.best[0]+'/'+x.s.best[1],-1,x=>x.s.best[0]>0);
  D.bavg=top(P,x=>bowlAvg(x.s),x=>f2(bowlAvg(x.s)),1,x=>x.s.bw>=min.wkts);
  D.econ=top(P,x=>bowlEcon(x.s),x=>f2(bowlEcon(x.s)),1,x=>x.s.bb>=min.bb);
  D.bsr=top(P,x=>bowlSR(x.s),x=>f1(bowlSR(x.s)),1,x=>x.s.bw>=min.wkts);
  D.w5=top(P,x=>x.s.w5,x=>x.s.w5,-1,x=>x.s.w5>0);
  D.md=top(P,x=>x.s.md,x=>x.s.md,-1,x=>x.s.md>0);
  D.ro=top(P,x=>x.s.ro,x=>x.s.ro,-1,x=>x.s.ro>0);
  D.st=top(P,x=>x.s.st,x=>x.s.st,-1,x=>x.s.st>0);
  D.motm=top(P,x=>x.s.motm,x=>x.s.motm,-1,x=>x.s.motm>0);
  D.caps=top(P,x=>x.s.m,x=>x.s.m);
  D.capw=top(P,x=>x.s.cw,x=>x.s.cw+' of '+x.s.cm,-1,x=>x.s.cw>0);
  D.cappct=top(P,x=>x.s.cw/x.s.cm*100,x=>f1(x.s.cw/x.s.cm*100)+'% ('+x.s.cm+')',-1,x=>x.s.cm>=min.cap);
  // per-match archive scans
  const keepers=new Map(),fielders=new Map(),f50=[],f100=[],bbm=[],parts=[],tots=[],lows=[],winr=[],winw=[];
  for(const E of S.matches){
    if(E.fmt!==fmt)continue;
    const mb={};
    E.inns.forEach((I,ii)=>{
      const sub={mid:E.id,date:E.date,team:teamShort(I.bat),vs:teamShort(I.bowl)};
      tots.push({v:I.runs+(I.wkts<10?.1:0),txt:I.runs+(I.wkts<10?'/'+I.wkts+(I.why==='declared'?'d':''):''),...sub,label:teamName(I.bat)});
      if(I.why==='all out')lows.push({v:I.runs,txt:String(I.runs),...sub,label:teamName(I.bat)});
      for(const r of I.bt){
        if(r[8])f50.push({pid:r[0],v:r[8],txt:r[8]+' balls',...sub});
        if(r[9])f100.push({pid:r[0],v:r[9],txt:r[9]+' balls',...sub});
        const f=r[7];if(!f||!r[5]||r[5]==='ro')continue;
        const m=f===E.xi[I.bowl][11]?keepers:fielders;
        m.set(f,(m.get(f)||0)+1);
      }
      for(const p of I.parts)parts.push({v:p[2],txt:p[2]+(p[5]?'':'*'),w:p[4],a:p[0],b:p[1],...sub});
      for(const w of I.bw){const x=mb[w[0]]=mb[w[0]]||{w:0,r:0,team:I.bowl};x.w+=w[4];x.r+=w[3];}
    });
    if(fmt==='TEST')for(const pid in mb)bbm.push({pid:+pid,v:mb[pid].w*1000-mb[pid].r,txt:mb[pid].w+'/'+mb[pid].r,mid:E.id,date:E.date});
    const r=E.result;
    if(r.type==='runs')winr.push({v:r.margin,txt:r.margin+' runs',label:teamName(r.winner),mid:E.id,date:E.date,vs:teamShort(otherOf(E,r.winner))});
    if(r.type==='inns')winr.push({v:r.margin+1000,txt:'Inns & '+r.margin,label:teamName(r.winner),mid:E.id,date:E.date,vs:teamShort(otherOf(E,r.winner))});
    if(r.type==='wkts'){const I=E.inns[E.inns.length-1],left=fmt==='TEST'?0:(I.mo||50)*6-I.lb;winw.push({v:r.margin*1000+left,txt:r.margin+' wkts'+(left?` (${left} balls left)`:''),label:teamName(r.winner),mid:E.id,date:E.date,vs:teamShort(otherOf(E,r.winner))});}
  }
  const t10=(a,dir=-1)=>a.sort((x,y)=>dir*(x.v-y.v)).slice(0,10);
  const pteam=pid=>ST[pid]?team(ST[pid]):'';
  D.ct=[...fielders].map(([pid,v])=>({pid,v,txt:v,team:pteam(pid)})).sort((a,b)=>b.v-a.v).slice(0,10);
  D.wkd=[...keepers].map(([pid,v])=>{const st=ST[pid]?.st||0;return{pid,v,txt:v+` (${v-st} ct, ${st} st)`,team:pteam(pid)};}).sort((a,b)=>b.v-a.v).slice(0,10);
  D.fast50=t10(f50,1);D.fast100=t10(f100,1);D.bbm=t10(bbm);
  D.part=t10(parts.slice());
  for(let w=1;w<=10;w++)D['p'+w]=t10(parts.filter(p=>p.w===w));
  D.tot=t10(tots);D.low=t10(lows,1);D.winr=t10(winr);D.winw=t10(winw);
  D.teamwl=Object.entries(S.teams[fmt]).map(([t,T])=>({team:+t,v:T.w/Math.max(1,T.p),T})).sort((a,b)=>b.v-a.v);
  REC_CACHE={key,S,data:D};
  return D;
}
const otherOf=(E,t)=>E.teams[0]===t?E.teams[1]:E.teams[0];
