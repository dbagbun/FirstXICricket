// ═══ COMPARE & CAREER GRAPHS — two players side by side in the Stats lab, and how their careers grew ═══
// careerSeries(pid, fmt): his matches in order with cumulative runs and wickets and a rolling batting average.
function careerSeries(pid,fmt){
  const out=[];let runs=0,wk=0;const last=[];
  for(const E of S.matches){
    if(E.fmt!==fmt||!E.teams.some(t=>E.xi[t].slice(0,11).includes(pid)))continue;
    let r=0,bw=0;
    for(const I of E.inns){const b=I.bt.find(x=>x[0]===pid);if(b){r+=b[1];last.push([b[1],b[5]?1:0]);if(last.length>10)last.shift();}const w=I.bw.find(x=>x[0]===pid);if(w)bw+=w[4];}
    runs+=r;wk+=bw;
    const outs=last.reduce((a,x)=>a+x[1],0),ra=last.reduce((a,x)=>a+x[0],0);
    out.push({date:E.date,runs,wk,roll:last.length>=3?(outs?ra/outs:ra):null});
  }
  return out;
}
const CMP_COL=['var(--cyan)','var(--gold)'];   // theme colours, so both read on dark and light
function lineChart(series,label){
  const W=640,H=200,pad=34,n=Math.max(2,...series.map(s=>s.pts.length)),mx=Math.max(1,...series.flatMap(s=>s.pts.filter(v=>v!=null)));
  const X=i=>pad+(W-pad-8)*i/(n-1),Y=v=>H-22-(H-40)*v/mx;
  const path=s=>{let d='';s.pts.forEach((v,i)=>{if(v==null)return;d+=(d&&s.pts[i-1]!=null?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1);});return d;};
  return`<div class="chart"><div class="sub" style="font-size:12px">${esc(label)}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    <line x1="${pad}" y1="${H-22}" x2="${W-8}" y2="${H-22}" stroke="var(--line)"/><text x="4" y="${Y(mx)+4}" font-size="11" fill="var(--muted)">${Math.round(mx)}</text><text x="${pad}" y="${H-6}" font-size="11" fill="var(--muted)">match 1</text><text x="${W-8}" y="${H-6}" font-size="11" fill="var(--muted)" text-anchor="end">${n}</text>
    ${series.map((s,k)=>`<path d="${path(s)}" fill="none" stroke="${s.color||CMP_COL[k]}" stroke-width="2.2"/>`).join('')}</svg>
    <div class="row" style="font-size:12px">${series.map((s,k)=>`<span><span style="display:inline-block;width:10px;height:3px;background:${s.color||CMP_COL[k]};vertical-align:middle"></span> ${esc(s.name)}</span>`).join('')}</div></div>`;
}
// The comparison table: the better figure in bold.
function compareHTML(a,b,fmt){
  const ps=[a,b].filter(Boolean);if(!ps.length)return'<div class="empty">Pick one player to see his career graphs, or two to compare them.</div>';
  const st=p=>S.stats[fmt][p]||null;
  if(!ps.some(st))return`<div class="empty">No ${FMT_NAME[fmt]} career for ${ps.map(p=>esc(pName(p))).join(' or ')} yet.</div>`;
  const rows=[['Matches',s=>s.m,1],['Runs',s=>s.r,1],['Batting average',s=>batAvg(s),1,f2],['Strike rate',s=>batSR(s),1,f1],['Hundreds',s=>s.c100,1],['Fifties',s=>s.c50,1],['Highest',s=>s.hs,1,(v,s)=>v+(s.hsNo?'*':'')],
    ['Wickets',s=>s.bw,1],['Bowling average',s=>s.bw?bowlAvg(s):null,-1,f2],['Economy',s=>s.bb?bowlEcon(s):null,-1,f2],['Five-fors',s=>s.w5,1],['Best',s=>s.best[0]*1000-s.best[1],1,(v,s)=>s.best[0]+'/'+s.best[1]],['Catches',s=>s.ct,1],['Man of the Match',s=>s.motm,1]];
  const tbl=`<table class="num"><tr><th></th>${ps.map((p,k)=>`<th class="r"><span style="color:${CMP_COL[k]}">●</span> ${plink(p)}</th>`).join('')}</tr>
    ${rows.map(([lab,f,dir,fmtv])=>{const v=ps.map(p=>st(p)?f(st(p)):null);if(v.every(x=>x==null||x===0))return'';
      const best=ps.length===2&&v[0]!=null&&v[1]!=null&&v[0]!==v[1]?((v[0]-v[1])*dir>0?0:1):-1;
      return`<tr><td class="sub">${lab}</td>${v.map((x,k)=>`<td class="r">${x==null?'-':(k===best?'<b class="gold">':'')+(fmtv?fmtv(x,st(ps[k])):x)+(k===best?'</b>':'')}</td>`).join('')}</tr>`;}).join('')}</table>`;
  const ser=ps.map(p=>careerSeries(p,fmt));
  const bowls=ps.some(p=>(st(p)||{}).bw>0);
  return`${tbl}<div class="grid g2" style="margin-top:12px;align-items:start">
    ${lineChart(ps.map((p,k)=>({name:pName(p),pts:ser[k].map(x=>x.runs)})),'Career runs, match by match')}
    ${lineChart(ps.map((p,k)=>({name:pName(p),pts:ser[k].map(x=>x.roll)})),'Batting average over his last 10 innings')}
    ${bowls?lineChart(ps.map((p,k)=>({name:pName(p),pts:ser[k].map(x=>x.wk)})),'Career wickets, match by match'):''}</div>`;
}
