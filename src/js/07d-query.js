// ═══ STATS LAB — filtered career tables, batter v bowler, grounds (all computed from the archive) ═══
// q = {fmt, from, to (years), team, opp, host (venue's home side), venue, pos ('' | 'top' 1-3 | 'mid' 4-7 | 'tail' 8-11 | n),
//      stage ('' | 'ko' | 'league' | 'final')}
const hostOf=E=>VENUE_HOME.get(E.venue)||0;
function matchPasses(E,q){
  if(q.fmt&&E.fmt!==q.fmt)return false;
  const y=+E.date.slice(0,4);if(q.from&&y<q.from)return false;if(q.to&&y>q.to)return false;
  if(q.team&&!E.teams.includes(+q.team))return false;
  if(q.opp&&!E.teams.includes(+q.opp))return false;
  if(q.host&&hostOf(E)!==+q.host)return false;
  if(q.venue&&E.venue!==q.venue)return false;
  if(q.stage){const st=E.stage||'',ko=/final|semi|quarter|play-off|round of/i.test(st);
    if(q.stage==='ko'&&!ko)return false;if(q.stage==='league'&&ko)return false;if(q.stage==='final'&&!/^final/i.test(st))return false;}
  return true;
}
const posOk=(i,p)=>!p||(p==='top'?i<3:p==='mid'?i>=3&&i<7:p==='tail'?i>=7:i===+p-1);
function queryStats(q){
  const bat=new Map(),bowl=new Map();
  for(const E of S.matches){
    if(!matchPasses(E,q))continue;
    for(const I of E.inns){
      if((!q.team||I.bat===+q.team)&&(!q.opp||I.bowl===+q.opp))I.bt.forEach((r,i)=>{
        if(!posOk(i,q.pos))return;
        const x=bat.get(r[0])||{pid:r[0],m:new Set(),inn:0,no:0,r:0,b:0,hs:0,hsNo:0,c100:0,c50:0,f6:0};
        x.m.add(E.id);x.inn++;x.r+=r[1];x.b+=r[2];x.f6+=r[4];if(!r[5])x.no++;
        if(r[1]>x.hs||(r[1]===x.hs&&!r[5])){x.hs=r[1];x.hsNo=r[5]?0:1;}
        if(r[1]>=100)x.c100++;else if(r[1]>=50)x.c50++;bat.set(r[0],x);
      });
      if((!q.team||I.bowl===+q.team)&&(!q.opp||I.bat===+q.opp))for(const w of I.bw){
        const x=bowl.get(w[0])||{pid:w[0],m:new Set(),bb:0,br:0,bw:0,md:0,best:[0,0],w5:0};
        x.m.add(E.id);x.bb+=w[1];x.br+=w[3];x.bw+=w[4];x.md+=w[2];if(w[4]>=5)x.w5++;
        if(w[4]>x.best[0]||(w[4]===x.best[0]&&w[3]<x.best[1]))x.best=[w[4],w[3]];bowl.set(w[0],x);
      }
    }
  }
  const B=[...bat.values()].map(x=>({...x,m:x.m.size,avg:x.inn-x.no?x.r/(x.inn-x.no):NaN,sr:x.b?100*x.r/x.b:NaN}));
  const W=[...bowl.values()].map(x=>({...x,m:x.m.size,avg:x.bw?x.br/x.bw:NaN,econ:x.bb?x.br/(x.bb/6):NaN,sr:x.bw?x.bb/x.bw:NaN}));
  return{bat:B.sort((a,b)=>b.r-a.r),bowl:W.sort((a,b)=>b.bw-a.bw||a.br-b.br)};
}
// Head to head: one batter against one bowler (or everyone), from the per-innings matchups
function headToHead(batter,bowler,fmt){
  const out=new Map();
  for(const E of S.matches){if(fmt&&E.fmt!==fmt)continue;
    for(const I of E.inns)for(const u of I.mu||[]){
      if(batter&&u[0]!==+batter)continue;if(bowler&&u[1]!==+bowler)continue;
      const k=batter?u[1]:u[0],x=out.get(k)||{pid:k,b:0,r:0,o:0,inn:0};
      x.b+=u[2];x.r+=u[3];x.o+=u[4];x.inn++;out.set(k,x);
    }}
  return[...out.values()];
}
function groundStats(fmt){
  const V=new Map();
  for(const E of S.matches){if(fmt&&E.fmt!==fmt)continue;if(!E.venue||!E.inns.length)continue;
    const v=V.get(E.venue)||{venue:E.venue,city:E.city,m:0,first:[],hi:null,lo:null,batFirstWins:0,decided:0};
    v.m++;v.first.push(E.inns[0].runs);
    for(const I of E.inns){if(!v.hi||I.runs>v.hi.r)v.hi={r:I.runs,w:I.wkts,t:I.bat,mid:E.id};if(I.why==='all out'&&(!v.lo||I.runs<v.lo.r))v.lo={r:I.runs,t:I.bat,mid:E.id};}
    if(E.result.winner){v.decided++;if(E.result.winner===E.inns[0].bat)v.batFirstWins++;}
    V.set(E.venue,v);}
  return[...V.values()].map(v=>({...v,avg1:v.first.reduce((a,b)=>a+b,0)/v.first.length})).sort((a,b)=>b.m-a.m);
}
