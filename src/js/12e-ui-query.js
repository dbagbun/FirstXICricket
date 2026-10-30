// ═══ STATS LAB SCREEN ═══
let Q_F={mode:'bat',fmt:'ODI',from:'',to:'',team:'',opp:'',host:'',venue:'',pos:'',stage:'',min:5,b1:'',b2:'',c1:'',c2:''};
function playerOptions(){
  const seen=new Set();let h='';
  for(const f of FORMATS)for(const pid in S.stats[f])if(!seen.has(pid)){seen.add(pid);h+=`<option value="${esc(pName(+pid))}">`;}
  return h;
}
const pidByName=n=>{if(!n)return 0;for(const f of FORMATS)for(const pid in S.stats[f])if(pName(+pid)===n)return+pid;return 0;};
RENDER.query=(el)=>{
  const q=Q_F,teams=[...TEAMS.values()].filter(t=>TEAM_GAMES.has(t.id)).sort((a,b)=>a.name.localeCompare(b.name));
  const tsel=(id,v,lab)=>`<select id="${id}"><option value="">${lab}</option>${teams.map(t=>`<option value="${t.id}" ${+v===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select>`;
  const years=[...new Set(S.matches.map(E=>E.date.slice(0,4)))];
  const ysel=(id,v,lab)=>`<select id="${id}"><option value="">${lab}</option>${years.map(y=>`<option ${+v===+y?'selected':''}>${y}</option>`).join('')}</select>`;
  const filters=q.mode==='cmp'?`<div class="row"><input list="q-pl" id="q-c1" placeholder="A player" value="${esc(q.c1)}"><span class="muted">v</span><input list="q-pl" id="q-c2" placeholder="Another (optional)" value="${esc(q.c2)}"><button class="btn pri sm" id="q-cgo">Compare</button><datalist id="q-pl">${playerOptions()}</datalist></div>`
    :q.mode==='h2h'?`<div class="row"><input list="q-pl" id="q-b1" placeholder="Batter" value="${esc(q.b1)}"><span class="muted">v</span><input list="q-pl" id="q-b2" placeholder="Bowler" value="${esc(q.b2)}"><button class="btn pri sm" id="q-go">Look up</button><datalist id="q-pl">${playerOptions()}</datalist></div>`
    :q.mode==='ground'?'':`<div class="row">${ysel('q-from',q.from,'From')}${ysel('q-to',q.to,'To')}${tsel('q-team',q.team,'For any team')}${tsel('q-opp',q.opp,'Against anyone')}${tsel('q-host',q.host,'In any country')}
      ${q.mode==='bat'?`<select id="q-pos">${[['','Any position'],['top','Openers & No.3'],['mid','Nos. 4-7'],['tail','Nos. 8-11'],...[1,2,3,4,5,6,7,8,9,10,11].map(n=>[n,'No. '+n])].map(([v,n])=>`<option value="${v}" ${String(q.pos)===String(v)?'selected':''}>${n}</option>`).join('')}</select>`:''}
      <select id="q-stage">${[['','Any stage'],['league','League/group games'],['ko','Knockouts'],['final','Finals']].map(([v,n])=>`<option value="${v}" ${q.stage===v?'selected':''}>${n}</option>`).join('')}</select>
      <label class="row" style="gap:4px">min <input type="number" id="q-min" value="${q.min}" min="0" style="width:60px"> ${q.mode==='bat'?'inns':'wkts'}</label></div>`;
  let body='';
  if(q.mode==='bat'||q.mode==='bowl'){
    const R=queryStats(q);
    if(q.mode==='bat'){const L=R.bat.filter(x=>x.inn>=q.min).slice(0,60);
      body=L.length?`<table class="num"><tr><th>Player</th><th class="r">M</th><th class="r">Inn</th><th class="r">Runs</th><th class="r">HS</th><th class="r">Avg</th><th class="r">SR</th><th class="r hide-sm">100</th><th class="r hide-sm">50</th><th class="r hide-sm">6s</th></tr>
        ${L.map(x=>`<tr><td>${plink(x.pid)}</td><td class="r">${x.m}</td><td class="r">${x.inn}</td><td class="r"><b>${x.r}</b></td><td class="r">${x.hs}${x.hsNo?'*':''}</td><td class="r">${f2(x.avg)}</td><td class="r">${f1(x.sr)}</td><td class="r hide-sm">${x.c100}</td><td class="r hide-sm">${x.c50}</td><td class="r hide-sm">${x.f6}</td></tr>`).join('')}</table>`:'<div class="empty">Nothing matches.</div>';}
    else{const L=R.bowl.filter(x=>x.bw>=q.min).slice(0,60);
      body=L.length?`<table class="num"><tr><th>Player</th><th class="r">M</th><th class="r">Wkts</th><th class="r">BB</th><th class="r">Avg</th><th class="r">Econ</th><th class="r">SR</th><th class="r hide-sm">5w</th></tr>
        ${L.map(x=>`<tr><td>${plink(x.pid)}</td><td class="r">${x.m}</td><td class="r"><b>${x.bw}</b></td><td class="r">${x.best[0]}/${x.best[1]}</td><td class="r">${f2(x.avg)}</td><td class="r">${f2(x.econ)}</td><td class="r">${f1(x.sr)}</td><td class="r hide-sm">${x.w5}</td></tr>`).join('')}</table>`:'<div class="empty">Nothing matches.</div>';}
  }else if(q.mode==='cmp'){body=compareHTML(pidByName(q.c1),pidByName(q.c2),q.fmt);
  }else if(q.mode==='h2h'){
    const a=pidByName(q.b1),b=pidByName(q.b2);
    if(!a&&!b)body='<div class="empty">Pick a batter, a bowler, or both.</div>';
    else{
      const L=headToHead(a,b,q.fmt).sort((x,y)=>y.o-x.o||y.b-x.b).slice(0,40);
      body=a&&b?(L[0]?`<div class="card"><h3>${esc(q.b1)} v ${esc(q.b2)}</h3><div class="grid g4 num"><div><div class="sub">Balls</div><b>${L[0].b}</b></div><div><div class="sub">Runs</div><b>${L[0].r}</b></div><div><div class="sub">Dismissals</div><b>${L[0].o}</b></div><div><div class="sub">Strike rate</div><b>${f1(100*L[0].r/Math.max(1,L[0].b))}</b></div></div></div>`:'<div class="empty">They have never met in this career.</div>')
        :`<table class="num"><tr><th>${a?'Bowler':'Batter'}</th><th class="r">Innings</th><th class="r">Balls</th><th class="r">Runs</th><th class="r">Out</th><th class="r">SR</th></tr>${L.map(x=>`<tr><td>${plink(x.pid)}</td><td class="r">${x.inn}</td><td class="r">${x.b}</td><td class="r">${x.r}</td><td class="r"><b>${x.o}</b></td><td class="r">${f1(100*x.r/Math.max(1,x.b))}</td></tr>`).join('')}</table>`;
    }
  }else{
    const L=groundStats(q.fmt).slice(0,60);
    body=L.length?`<table class="num"><tr><th>Ground</th><th class="r">M</th><th class="r">Avg 1st inns</th><th class="r hide-sm">Bat 1st wins</th><th class="r">Highest</th><th class="r hide-sm">Lowest</th></tr>
      ${L.map(v=>`<tr><td>${esc(v.venue)}</td><td class="r">${v.m}</td><td class="r">${Math.round(v.avg1)}</td><td class="r hide-sm">${v.decided?Math.round(100*v.batFirstWins/v.decided)+'%':'-'}</td>
        <td class="r" data-mid="${v.hi.mid}" style="cursor:pointer">${v.hi.r}${v.hi.w<10?'/'+v.hi.w:''} ${badge(v.hi.t)}</td><td class="r hide-sm">${v.lo?`${v.lo.r} ${badge(v.lo.t)}`:'-'}</td></tr>`).join('')}</table>`:'<div class="empty">No matches yet.</div>';
  }
  el.innerHTML=`<div class="card stack"><div class="row"><div class="seg">${[['bat','Batting'],['bowl','Bowling'],['cmp','Compare'],['h2h','Batter v bowler'],['ground','Grounds']].map(([k,n])=>`<button data-qm="${k}" class="${q.mode===k?'on':''}">${n}</button>`).join('')}</div>
    <div class="seg">${FORMATS.map(f=>`<button data-qf="${f}" class="${q.fmt===f?'on':''}">${FMT_PLURAL[f]}</button>`).join('')}</div></div>${filters}</div>
    <div class="card tbl-wrap" style="margin-top:14px">${body}</div>`;
  $$('[data-qm]').forEach(b=>b.onclick=()=>{q.mode=b.dataset.qm;rerender();});
  $$('[data-qf]').forEach(b=>b.onclick=()=>{q.fmt=b.dataset.qf;rerender();});
  for(const[id,k]of[['q-from','from'],['q-to','to'],['q-team','team'],['q-opp','opp'],['q-host','host'],['q-pos','pos'],['q-stage','stage'],['q-min','min']]){const e=$('#'+id);if(e)e.onchange=()=>{q[k]=k==='min'?+e.value:e.value;rerender();};}
  if($('#q-go'))$('#q-go').onclick=()=>{q.b1=$('#q-b1').value;q.b2=$('#q-b2').value;rerender();};
  if($('#q-cgo'))$('#q-cgo').onclick=()=>{q.c1=$('#q-c1').value;q.c2=$('#q-c2').value;rerender();};
};
// for the player card: who gets him out, and whom he gets out
function nemesisHTML(pid){
  const vs=headToHead(pid,0,'').filter(x=>x.o>0).sort((a,b)=>b.o-a.o||a.r-b.r).slice(0,3);
  const bun=headToHead(0,pid,'').filter(x=>x.o>0).sort((a,b)=>b.o-a.o||a.r-b.r).slice(0,3);
  if(!vs.length&&!bun.length)return'';
  return`<h3>Head to head</h3><div class="grid g2">${vs.length?`<div><div class="sub">His nemesis</div>${vs.map(x=>`<div>${plink(x.pid)} <span class="muted">${plural(x.o,'dismissal')} in ${x.b} balls</span></div>`).join('')}</div>`:''}
    ${bun.length?`<div><div class="sub">His bunny</div>${bun.map(x=>`<div>${plink(x.pid)} <span class="muted">dismissed ${x.o}×, ${x.r} runs off him</span></div>`).join('')}</div>`:''}</div>`;
}
