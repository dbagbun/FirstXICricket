// ═══ RECORDS, PLAYERS, RESULTS, MILESTONES ═══
let REC_F={fmt:'ODI',grp:'Batting'};
RENDER.records=(el)=>{
  const D=recordsData(REC_F.fmt),keys=REC_GROUPS.find(g=>g[0]===REC_F.grp)[1],min=REC_MIN[REC_F.fmt];
  const rowHTML=(k,r,i)=>{
    const who=r.pid?plink(r.pid):r.a?`${esc(pName(r.a))} &amp; ${esc(pName(r.b))}`:esc(r.label||'');
    const ctx=r.mid?`<span class="muted" style="font-size:12px">${r.team?esc(r.team)+' ':''}${r.vs?'v '+esc(r.vs)+' · ':''}${fmtDate(r.date)}</span>`:`<span class="muted" style="font-size:12px">${esc(r.team||'')}</span>`;
    return`<tr ${r.mid?`data-mid="${r.mid}" style="cursor:pointer"`:''}><td class="muted">${i+1}</td><td>${who}<br>${ctx}</td><td class="r num"><b>${esc(String(r.txt))}</b></td></tr>`;
  };
  const block=k=>{
    if(k==='teamwl'){const L=D.teamwl;return`<div class="card"><h3>${REC_NAME[k]}</h3><table class="num"><tr><th>Team</th><th class="r">P</th><th class="r">W</th><th class="r">L</th><th class="r">D/T/NR</th><th class="r">Win %</th></tr>
      ${L.map(x=>`<tr><td>${tlabel(x.team)}</td><td class="r">${x.T.p}</td><td class="r">${x.T.w}</td><td class="r">${x.T.l}</td><td class="r">${x.T.d+x.T.t+x.T.nr}</td><td class="r">${f1(100*x.v)}</td></tr>`).join('')}</table></div>`;}
    if(k==='bbm'&&REC_F.fmt==='ODI')return'';
    const rows=D[k]||[];
    return`<div class="card"><h3>${REC_NAME[k]}</h3>${rows.length?`<table>${rows.map((r,i)=>rowHTML(k,r,i)).join('')}</table>`:'<div class="muted">No record yet.</div>'}</div>`;
  };
  el.innerHTML=`<div class="card"><div class="row"><div class="seg">${['ODI','TEST'].map(f=>`<button data-rf="${f}" class="${REC_F.fmt===f?'on':''}">${f==='TEST'?'Tests':'ODIs'}</button>`).join('')}</div>
    <div class="seg">${REC_GROUPS.map(g=>`<button data-rg="${g[0]}" class="${REC_F.grp===g[0]?'on':''}">${g[0]}</button>`).join('')}</div></div>
    <div class="muted" style="font-size:12px;margin-top:6px">Qualification: averages ${min.inn}+ innings, strike rate ${min.balls}+ balls, bowling averages ${min.wkts}+ wickets, economy ${min.bb}+ balls, captaincy ${min.cap}+ matches.</div></div>
    <div class="grid g3" style="margin-top:14px">${keys.map(block).join('')}</div>`;
  $$('[data-rf]').forEach(b=>b.onclick=()=>{REC_F.fmt=b.dataset.rf;rerender();});
  $$('[data-rg]').forEach(b=>b.onclick=()=>{REC_F.grp=b.dataset.rg;rerender();});
};

let PL_F={fmt:'ODI',q:'',sort:'r',team:'',page:0};
const PL_COLS=[['m','M'],['inn','Inn'],['r','Runs'],['hs','HS'],['avg','Avg'],['sr','SR'],['c100','100'],['c50','50'],['bw','Wkts'],['bavg','Avg'],['econ','Econ'],['best','BB'],['ct','Ct'],['motm','MoM']];
const PL_VAL={avg:batAvg,sr:batSR,bavg:s=>-bowlAvg(s),econ:s=>-bowlEcon(s),best:s=>s.best[0]*1000-s.best[1]};
RENDER.players=(el)=>{
  const ST=S.stats[PL_F.fmt],q=PL_F.q.toLowerCase();
  let L=Object.entries(ST).map(([p,s])=>({pid:+p,s})).filter(x=>(!q||pName(x.pid).toLowerCase().includes(q))&&(!PL_F.team||x.s.teams.includes(+PL_F.team)));
  const v=x=>{const f=PL_VAL[PL_F.sort];const r=f?f(x.s):x.s[PL_F.sort];return isFinite(r)?r:-1e9;};
  L.sort((a,b)=>v(b)-v(a));
  const pages=Math.ceil(L.length/50);PL_F.page=clamp(PL_F.page,0,Math.max(0,pages-1));
  const rows=L.slice(PL_F.page*50,PL_F.page*50+50);
  const cell=(k,s)=>({avg:f2(batAvg(s)),sr:f1(batSR(s)),bavg:f2(bowlAvg(s)),econ:f2(bowlEcon(s)),best:s.bw?s.best[0]+'/'+s.best[1]:'-',hs:s.hs+(s.hsNo?'*':'')}[k]??s[k]);
  const teams=[...TEAMS.values()].sort((a,b)=>a.name.localeCompare(b.name));
  el.innerHTML=`<div class="card"><div class="row"><div class="seg">${['ODI','TEST'].map(f=>`<button data-pf="${f}" class="${PL_F.fmt===f?'on':''}">${f==='TEST'?'Tests':'ODIs'}</button>`).join('')}</div>
    <input type="search" id="pl-q" placeholder="Search players" value="${esc(PL_F.q)}">
    <select id="pl-t"><option value="">All teams</option>${teams.map(t=>`<option value="${t.id}" ${+PL_F.team===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select>
    <span class="muted">${L.length} players</span></div></div>
  <div class="card tbl-wrap" style="margin-top:14px">${L.length?`<table class="num"><tr><th>Player</th>${PL_COLS.map(([k,n])=>`<th class="r ${['inn','hs','c50','ct'].includes(k)?'hide-sm':''}" data-ps="${k}" style="cursor:pointer;${PL_F.sort===k?'color:var(--cyan)':''}">${n}</th>`).join('')}</tr>
    ${rows.map(x=>`<tr><td>${plink(x.pid)} <span class="muted" style="font-size:11px">${x.s.teams.map(teamShort).join('/')}</span></td>${PL_COLS.map(([k])=>`<td class="r ${['inn','hs','c50','ct'].includes(k)?'hide-sm':''}">${cell(k,x.s)}</td>`).join('')}</tr>`).join('')}</table>
    <div class="row" style="margin-top:10px">${PL_F.page>0?'<button class="btn sm" id="pl-prev">Previous</button>':''}<span class="muted">Page ${PL_F.page+1} of ${pages}</span>${PL_F.page<pages-1?'<button class="btn sm" id="pl-next">Next</button>':''}</div>`:'<div class="empty">No players yet - play some cricket.</div>'}</div>`;
  $$('[data-pf]').forEach(b=>b.onclick=()=>{PL_F.fmt=b.dataset.pf;PL_F.page=0;rerender();});
  $$('[data-ps]').forEach(b=>b.onclick=()=>{PL_F.sort=b.dataset.ps;PL_F.page=0;rerender();});
  $('#pl-q').oninput=e=>{PL_F.q=e.target.value;PL_F.page=0;clearTimeout(PL_F.t);PL_F.t=setTimeout(()=>{rerender();const i=$('#pl-q');i.focus();i.setSelectionRange(i.value.length,i.value.length);},250);};
  $('#pl-t').onchange=e=>{PL_F.team=e.target.value;PL_F.page=0;rerender();};
  $('#pl-prev')&&($('#pl-prev').onclick=()=>{PL_F.page--;rerender();});$('#pl-next')&&($('#pl-next').onclick=()=>{PL_F.page++;rerender();});
};

let HI_F={fmt:'',team:'',page:0};
RENDER.history=(el)=>{
  const L=S.matches.filter(E=>(!HI_F.fmt||E.fmt===HI_F.fmt)&&(!HI_F.team||E.teams.includes(+HI_F.team))).reverse();
  const pages=Math.max(1,Math.ceil(L.length/25));HI_F.page=clamp(HI_F.page,0,pages-1);
  const teams=[...TEAMS.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const h2h=HI_F.team?Object.entries(L.reduce((o,E)=>{const opp=otherOf(E,+HI_F.team),r=o[opp]=o[opp]||{p:0,w:0,l:0};r.p++;if(E.result.winner===+HI_F.team)r.w++;else if(E.result.winner)r.l++;return o;},{})).sort((a,b)=>b[1].p-a[1].p):[];
  el.innerHTML=`<div class="card"><div class="row"><div class="seg">${[['','All'],['ODI','ODI'],['TEST','Test']].map(([k,n])=>`<button data-hf="${k}" class="${HI_F.fmt===k?'on':''}">${n}</button>`).join('')}</div>
    <select id="hi-t"><option value="">All teams</option>${teams.map(t=>`<option value="${t.id}" ${+HI_F.team===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select><span class="muted">${L.length} matches</span></div></div>
  ${h2h.length?`<div class="card" style="margin-top:14px"><h3>${esc(teamName(+HI_F.team))} head to head</h3><div class="grid g4">${h2h.map(([t,r])=>`<div class="spread"><span>${badge(+t)} ${esc(teamName(+t))}</span><span class="num">P${r.p} W${r.w} L${r.l}</span></div>`).join('')}</div></div>`:''}
  <div class="card stack" style="margin-top:14px">${L.slice(HI_F.page*25,HI_F.page*25+25).map(matchLine).join('<hr style="border:0;border-top:1px solid var(--line)">')||'<div class="empty">No results yet.</div>'}
  <div class="row">${HI_F.page>0?'<button class="btn sm" id="hi-prev">Newer</button>':''}<span class="muted">Page ${HI_F.page+1} of ${pages}</span>${HI_F.page<pages-1?'<button class="btn sm" id="hi-next">Older</button>':''}</div></div>`;
  $$('[data-hf]').forEach(b=>b.onclick=()=>{HI_F.fmt=b.dataset.hf;HI_F.page=0;rerender();});
  $('#hi-t').onchange=e=>{HI_F.team=e.target.value;HI_F.page=0;rerender();};
  $('#hi-prev')&&($('#hi-prev').onclick=()=>{HI_F.page--;rerender();});$('#hi-next')&&($('#hi-next').onclick=()=>{HI_F.page++;rerender();});
};

let MS_F={fmt:'',cat:''};
RENDER.miles=(el)=>{
  const cats=[...new Set(S.ms.map(m=>m.cat))].sort();
  const L=S.ms.filter(m=>(!MS_F.fmt||m.fmt===MS_F.fmt)&&(!MS_F.cat||m.cat===MS_F.cat)).slice().reverse();
  el.innerHTML=`<div class="card"><div class="row"><div class="seg">${[['','All'],['ODI','ODI'],['TEST','Test']].map(([k,n])=>`<button data-mf="${k}" class="${MS_F.fmt===k?'on':''}">${n}</button>`).join('')}</div>
    <select id="ms-c"><option value="">All milestones</option>${cats.map(c=>`<option ${c===MS_F.cat?'selected':''}>${esc(c)}</option>`).join('')}</select><span class="muted">${L.length}</span></div></div>
  <div class="card" style="margin-top:14px">${L.length?`<table>${L.slice(0,300).map(m=>`<tr ${m.mid?`data-mid="${m.mid}" style="cursor:pointer"`:''}><td class="muted num" style="white-space:nowrap">${fmtDate(m.date)}</td><td><span class="pill">${m.fmt}</span></td><td>${plink(m.pid)}</td><td class="sub">${esc(m.text)}</td></tr>`).join('')}</table>`:'<div class="empty">Milestones are logged live as they happen - 1,000-run careers, hundreds, five-fors, hat-tricks, fastest fifties.</div>'}</div>`;
  $$('[data-mf]').forEach(b=>b.onclick=()=>{MS_F.fmt=b.dataset.mf;rerender();});
  $('#ms-c').onchange=e=>{MS_F.cat=e.target.value;rerender();};
};
