// ═══ SEASON REVIEW — a year of your timeline on one page, and as an image ═══
// seasonData(year) gathers it from the archive: your side's record and trophies, the champions crowned, the
// year's best performers and performances, the tightest finishes, awards, back pages, your best quote (coach),
// targets, milestones and the Hall of Fame class. View 'season' (arg: year); seasonImage(year) draws it.
const isFinalStage=E=>/^final$/i.test(E.stage||'');
function seasonYears(){return[...new Set(S.matches.map(E=>+E.date.slice(0,4)))].sort((a,b)=>a-b);}
function seasonData(year){
  const y=String(year),M=S.matches.filter(E=>E.date.startsWith(y));if(!M.length)return null;
  const my=pressTeam()||0;
  const rec={};
  if(my)for(const E of M){if(!E.teams.includes(my))continue;const r=rec[E.fmt]=rec[E.fmt]||{p:0,w:0,l:0,d:0};r.p++;
    if(E.result.winner===my)r.w++;else if(E.result.winner)r.l++;else r.d++;}
  const champs=M.filter(E=>isFinalStage(E)&&E.result.winner).map(E=>({title:E.series,team:E.result.winner,E}));
  if(S.wtc&&S.wtc[year]&&S.wtc[year].champ)champs.push({title:`World Test Championship ${year-2}-${y.slice(2)}`,team:S.wtc[year].champ[0],shared:S.wtc[year].champ.length>1});
  const sids=my?[...new Set(M.filter(E=>E.teams.includes(my)&&E.sid).map(E=>E.sid))]:[];
  const series=sids.map(sid=>{const r=seriesRecord(sid,my),E=M.find(x=>x.sid===sid);return{sid,title:E.series,...r};}).filter(s=>s.p>=2);
  const runs={},wk={};
  for(const E of M)for(const I of E.inns){for(const r of I.bt)runs[r[0]]=(runs[r[0]]||0)+r[1];for(const w of I.bw)wk[w[0]]=(wk[w[0]]||0)+w[4];}
  const top=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([p,v])=>({pid:+p,v}));
  let hs=null,bb=null;
  for(const E of M)for(const I of E.inns){
    for(const r of I.bt)if(!hs||r[1]>hs.v)hs={pid:r[0],v:r[1],no:!r[5],E};
    for(const w of I.bw)if(!bb||w[4]>bb.w||(w[4]===bb.w&&w[3]<bb.r))bb={pid:w[0],w:w[4],r:w[3],E};}
  const close=M.filter(E=>E.result.type==='tie'||E.result.type==='so'||(E.result.type==='runs'&&E.result.margin<=3)||(E.result.type==='wkts'&&E.result.margin===1)).slice(-5);
  const heads=S.press?S.press.heads.filter(h=>h.date.startsWith(y)):[];
  // the big stories first (titles, shocks, finals), one of each headline, newest first
  const weight=h=>/CHAMPIONS|GLORY|CONQUER/.test(h.h)?3:/SHOCK|GIANT|HUMILIATION|TIED/.test(h.h)?2:/FINAL|HEARTBREAK|NAIL|THRILLER/.test(h.h)?1:0,seen=new Set();
  const pickHeads=heads.slice().reverse().sort((a,b)=>weight(b)-weight(a)).filter(h=>{const k=h.h.replace(/^FINAL /,'');if(seen.has(k))return false;seen.add(k);return true;}).slice(0,4).sort((a,b)=>a.date<b.date?1:-1);
  const quotes=(S.press&&S.press.quotes||[]).filter(q=>q.date.startsWith(y));
  const quote=quotes.slice().sort((a,b)=>(b.bold||0)-(a.bold||0))[0]||null;
  const objs=S.coach?S.coach.objs.filter(o=>(o.status==='met'||o.status==='failed')&&(o.created||'').startsWith(y)):[];
  const ms=S.ms.filter(m=>m.date.startsWith(y));
  const hofc=S.hof?Object.entries(S.hof.inducted).filter(([,x])=>x.year===+year).map(([p])=>+p):[];
  return{year:+year,n:M.length,my,rec,champs,series,topRuns:top(runs,3),topWk:top(wk,3),hs,bb,close,heads:pickHeads,quote,objs,ms,hofc,awards:R_().awards[year]||null,
    done:+y<+careerDate().slice(0,4)};
}
RENDER.season=(el,arg)=>{
  const years=seasonYears();if(!years.length){el.innerHTML='<div class="card empty">Play a season first.</div>';return;}
  const done=years.filter(y=>y<+careerDate().slice(0,4)),year=+arg||done[done.length-1]||years[years.length-1],D=seasonData(year);
  S.seasonSeen=Math.max(S.seasonSeen||0,year);
  const link=E=>`<span data-mid="${E.id}" style="cursor:pointer;text-decoration:underline dotted">${esc(teamShort(E.teams[0]))} v ${esc(teamShort(E.teams[1]))}</span>`;
  const card=(t,b)=>b?`<div class="card"><h3>${t}</h3>${b}</div>`:'';
  el.innerHTML=`<div class="stack"><div class="card hi"><div class="spread"><div><div class="sub">Season review</div><h2 style="margin:2px 0">${year}${D.done?'':' (so far)'}</h2>
      <div class="muted">${plural(D.n,'match','matches')} in your timeline${D.my?' · '+esc(teamName(D.my)):''}</div></div>
      <div class="row"><select id="sr-y">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select><button class="btn" id="sr-img">Save as image</button></div></div></div>
    <div class="grid g2" style="align-items:start"><div class="stack">
      ${D.my&&Object.keys(D.rec).length?card(`${esc(teamName(D.my))}'s year`,`${Object.entries(D.rec).map(([f,r])=>`<div class="spread"><span>${FMT_PLURAL[f]}</span><span class="num">P${r.p} W${r.w} L${r.l}${r.d?' D/NR'+r.d:''}</span></div>`).join('')}
        ${D.series.length?`<div style="margin-top:8px">${D.series.map(s=>`<div class="spread"><span class="muted" style="font-size:12px">${esc(s.title)}</span><span class="pill ${s.w>s.l?'win':s.l>s.w?'loss':''}">W${s.w} L${s.l}</span></div>`).join('')}</div>`:''}`):''}
      ${card('Champions',D.champs.map(c=>`<div>🏆 ${tlabel(c.team)} <span class="muted">${esc(c.title)}${c.shared?' (shared)':''}</span></div>`).join(''))}
      ${card('Performers',`<div class="grid g2"><div><div class="sub">Most runs</div>${D.topRuns.map(x=>`<div>${plink(x.pid)} <b class="num">${x.v}</b></div>`).join('')}</div>
        <div><div class="sub">Most wickets</div>${D.topWk.map(x=>`<div>${plink(x.pid)} <b class="num">${x.v}</b></div>`).join('')}</div></div>
        ${D.hs?`<div style="margin-top:8px">Highest score: ${plink(D.hs.pid)} <b>${D.hs.v}${D.hs.no?'*':''}</b> <span class="muted">${link(D.hs.E)}</span></div>`:''}
        ${D.bb?`<div>Best bowling: ${plink(D.bb.pid)} <b>${D.bb.w}/${D.bb.r}</b> <span class="muted">${link(D.bb.E)}</span></div>`:''}`)}
      ${D.awards?card('Awards',`<table>${AWARD_NAMES.filter(([k])=>D.awards[k]).map(([k,n,u])=>`<tr><td class="sub">${n}</td><td>${awardLine(D.awards,k,u)}</td></tr>`).join('')}</table>`):''}
    </div><div class="stack">
      ${D.heads.length?card('Back pages',`<div class="stack" style="gap:8px">${D.heads.map((h,i)=>headHTML(h,i===0)).join('')}</div>`):''}
      ${D.quote?card('Quote of the year',`<div style="font-size:18px">“${esc(D.quote.a)}”</div><div class="muted" style="font-size:12px;margin-top:4px">Asked: ${esc(D.quote.q)} · ${fmtDate(D.quote.date)}</div>`):''}
      ${D.objs.length?card("The board's verdict",D.objs.map(o=>`<div class="spread"><span>${esc(o.text)} <span class="muted">${esc(o.title)}</span></span><span class="pill ${o.status==='met'?'win':'loss'}">${o.status}</span></div>`).join('')):''}
      ${D.close.length?card('Edge of the seat',D.close.map(E=>`<div class="spread"><span>${link(E)} <span class="muted" style="font-size:12px">${esc(E.series)}</span></span><span>${esc(E.result.text)}</span></div>`).join('')):''}
      ${D.hofc.length?card('Into the Hall of Fame',D.hofc.map(p=>`<div>🏛️ ${plink(p)}</div>`).join('')):''}
      ${D.ms.length?card('Milestones',`${D.ms.slice(-8).reverse().map(m=>`<div>🏅 ${plink(m.pid)} <span class="sub">${esc(m.text)}</span></div>`).join('')}${D.ms.length>8?`<div class="muted" style="font-size:12px">and ${D.ms.length-8} more</div>`:''}`):''}
    </div></div></div>`;
  $('#sr-y').onchange=e=>go('season',+e.target.value);
  $('#sr-img').onclick=()=>downloadCanvas(seasonImage(year),`first-xi-season-${year}.png`);
};
// The shareable image: the headline facts of the year.
function seasonImage(year){
  const D=seasonData(year);if(!D)return null;
  const blocks=[];
  if(D.my&&Object.keys(D.rec).length)blocks.push({head:teamName(D.my)+"'s year",rows:Object.entries(D.rec).map(([f,r])=>[FMT_PLURAL[f],`W${r.w} L${r.l}${r.d?' D'+r.d:''}`])});
  if(D.champs.length)blocks.push({head:'Champions',rows:D.champs.slice(0,6).map(c=>[c.title,teamShort(c.team)])});
  blocks.push({head:'Performers',rows:[...D.topRuns.slice(0,2).map(x=>[pName(x.pid)+' (runs)',x.v]),...D.topWk.slice(0,2).map(x=>[pName(x.pid)+' (wickets)',x.v]),
    ...(D.hs?[['Highest score: '+pName(D.hs.pid),D.hs.v+(D.hs.no?'*':'')]]:[]),...(D.bb?[['Best bowling: '+pName(D.bb.pid),D.bb.w+'/'+D.bb.r]]:[])]});
  if(D.awards)blocks.push({head:'Awards',rows:AWARD_NAMES.filter(([k])=>D.awards[k]).slice(0,4).map(([k,n])=>[n,pName(D.awards[k].pid)])});
  if(D.heads.length)blocks.push({head:'Back page',rows:[[D.heads[0].h.slice(0,52),null]]});
  if(D.quote)blocks.push({head:'Quote of the year',rows:[['"'+D.quote.a.slice(0,60)+'"',null]]});
  return canvasCard(`${year} season review`,`${D.n} matches in your timeline${D.my?' · '+teamName(D.my):''}`,blocks,'First XI Cricket · your timeline');
}
// A dashboard nudge once a year is over and its review unread.
function seasonNudgeHTML(){
  const y=+careerDate().slice(0,4)-1;if(!S.matches.length||(S.seasonSeen||0)>=y||!S.matches.some(E=>E.date.startsWith(String(y))))return'';
  return`<div class="banner" style="margin-bottom:14px"><div class="spread"><span>📰 <b>The ${y} season review is in</b> <span class="sub">champions, performers, back pages and more.</span></span><button class="btn sm pri" data-go="season" data-arg="${y}">Read it</button></div></div>`;
}
