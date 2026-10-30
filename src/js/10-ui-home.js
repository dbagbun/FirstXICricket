// ═══ DASHBOARD, FIXTURES & BULK SIM ═══
function fixtureTeams(fx){
  // what the fixture will be in your timeline (knockouts may be re-seeded)
  if(fx.fmt==='ODI'&&fx.f){const k=resolveFixture(fx.f);if(k)return[k.a,k.b];}
  return[fx.a,fx.b];
}
RENDER.home=(el)=>{
  const n=nextFixture(),live=S.live&&S.live.state!=='done'?S.live:null;
  const playedO=S.matches.filter(m=>m.fmt==='ODI'&&m.fid).length,playedT=S.matches.filter(m=>m.fmt==='TEST').length,playedT20=S.matches.filter(m=>m.fmt==='T20').length,total=ODI_FX.filter(x=>x.playable).length;
  const recent=S.matches.slice(-5).reverse();
  const top=(fmt,f,lab)=>{const L=Object.entries(S.stats[fmt]).sort((a,b)=>f(b[1])-f(a[1]))[0];return L&&f(L[1])>0?`<div class="spread"><span class="sub">${lab}</span><span>${plink(+L[0])} <b class="num">${f(L[1])}</b></span></div>`:'';};
  let nextCard='<div class="card empty">Every fixture has been played. What a career.</div>';
  if(n){
    const [a,b]=fixtureTeams(n),E=n.fmt==='ODI'&&n.f?edition(n.sid):null,st=E?E.stageOf.get(n.f.no):'';
    const re=n.fmt==='ODI'&&(a!==n.a||b!==n.b)&&!(a===n.b&&b===n.a);
    const ss=seriesStatus(n.sid);
    nextCard=`<div class="card hi stack"><div class="spread"><h3 style="margin:0">Next fixture</h3><span class="pill ${n.fmt==='TEST'?'test':st&&st!=='group'&&st!=='super'?'ko':''}">${n.fmt!=='ODI'?FMT_NAME[n.fmt].toUpperCase():st&&st!=='group'?stageName(st,E):'ODI'}</span></div>
      <div class="sub">${esc(n.title)} · ${esc(n.label)}</div>
      <h2 style="margin:2px 0">${tlabel(a)} <span class="muted">v</span> ${tlabel(b)}</h2>
      ${re?`<div class="banner">Re-seeded from your tables (in history: ${esc(teamName(n.a))} v ${esc(teamName(n.b))})</div>`:''}
      <div class="muted">${esc(n.venue)} · ${fmtDate(n.date)}${ss&&ss.played?' · '+esc(ss.text):''}</div>
      <div class="row"><button class="btn pri" id="h-play">${live&&live.key===n.key?'Resume match':'Play match'}</button><button class="btn" id="h-sim">Quick sim</button>
        <button class="btn" id="h-sims">Sim rest of series</button><button class="btn" id="h-simn">Sim more…</button></div></div>`;
  }
  const tourn=n&&n.f&&n.fmt==='ODI'&&SERIES.get(n.sid)?.kind==='tournament'?miniTable(n.sid):'';
  const my=S.settings.myTeam,myT=my&&(S.teams.ODI[my]||S.teams.TEST[my]);
  const C=S.coach,cnx=C&&C.team?coachNext():null;
  const coachCard=C?`<div class="card hi"><div class="spread"><div>${C.team?`<span class="sub">Coach of</span> <b>${tlabel(C.team)}</b>`:'<b>Out of work</b>'}
      ${C.team?`<div style="width:220px;margin-top:6px">${confBar(C.conf)}</div><span class="muted" style="font-size:12px">Board confidence ${Math.round(C.conf)}</span>${C.pc&&C.pc.qs.some(q=>q.a==null)?' <span class="pill live">press conference</span>':''}`:`<div class="muted">${plural(C.offers.length,'offer')} waiting</div>`}</div>
      <div class="row">${cnx?(nextFixture()&&nextFixture().key===cnx.key?`<button class="btn pri" data-playkey="${cnx.key}">Play ${esc(teamShort(cnx.a))} v ${esc(teamShort(cnx.b))}</button>`:`<button class="btn pri" id="h-simto">Sim to my next match (${fmtDate(cnx.date)})</button>`):''}<button class="btn" data-go="coach">Coach</button></div></div></div>`:'';
  const futureNote=S.gen&&careerDate()>LAST_REAL?`<div class="banner" style="margin-bottom:14px">🔭 <b>The future, ${careerDate().slice(0,4)}.</b> <span class="sub">The real calendar ended in ${fmtDate(LAST_REAL)}. Fixtures are now generated a year at a time; veterans age and retire and new players come through.</span></div>`:'';
  el.innerHTML=backupBanner()+startHereHTML()+seasonNudgeHTML()+futureNote+meCardHTML()+coachCard+`<div class="grid g3 home-grid" style="${C?';margin-top:14px':''}">
    <div class="stack">
      ${live&&(!n||live.key!==n.key)?`<div class="card"><div class="spread"><div><span class="pill live">LIVE</span> <b>${esc(teamName(live.teams[0]))} v ${esc(teamName(live.teams[1]))}</b></div><button class="btn pri" data-go="match">Resume</button></div></div>`:''}
      ${nextCard}${tourn}
      ${driftCard()}${backPagesHTML()}
      <div class="card"><h3>Recent results</h3>${recent.length?recent.map(matchLine).join('<hr style="border:0;border-top:1px solid var(--line)">'):'<p class="muted">No matches yet. Your career starts with the '+esc(seriesOf(FIX[0]).title)+'.</p>'}</div>
    </div>
    <div class="stack">
      <div class="card"><h3>Career</h3><div class="spread"><span class="sub">ODIs played</span><b class="num">${playedO} / ${total}</b></div>
        <div class="bar" style="margin:6px 0 10px"><i style="width:${(100*playedO/total).toFixed(1)}%"></i></div>
        ${playedT?`<div class="spread"><span class="sub">Tests played</span><b class="num">${playedT}</b></div>`:''}${playedT20?`<div class="spread"><span class="sub">T20s played</span><b class="num">${playedT20}</b></div>`:''}
        ${top('ODI',s=>s.r,'Most ODI runs')}${top('ODI',s=>s.bw,'Most ODI wickets')}${top('TEST',s=>s.r,'Most Test runs')}${top('TEST',s=>s.bw,'Most Test wickets')}</div>
      ${myT?`<div class="card"><h3>${badge(my)} ${esc(teamName(my))}</h3>${FORMATS.filter(f=>S.teams[f][my]).map(f=>{const T=S.teams[f][my];return`<div class="spread"><span class="sub">${f}</span><span class="num">P${T.p} W${T.w} L${T.l}${T.d?' D'+T.d:''}${T.t?' T'+T.t:''}</span></div>`;}).join('')}</div>`:''}
      <div class="card"><h3>Latest milestones</h3>${S.ms.slice(-6).reverse().map(m=>`<div style="margin-bottom:6px">🏅 ${plink(m.pid)} <span class="sub">${esc(m.text)}</span></div>`).join('')||'<p class="muted">None yet.</p>'}
        <button class="btn sm" data-go="miles">All milestones</button></div>
      ${hofCardHTML()}
      <div class="card"><h3>Tests &amp; T20s</h3><p class="sub" style="margin-top:0">The fixture list is the real ODI calendar. Schedule Test, ODI or T20 series between any two sides and they slot into your career by date.</p><button class="btn" id="h-test">Schedule a series</button> <button class="btn" id="h-friendly">Friendly / head-to-head</button></div>
    </div></div>`;
  if(n){
    $('#h-play').onclick=()=>startFixture(n.key);
    $('#h-sim').onclick=()=>{const M=quickSim(n.key);toast(esc(M.result.text));rerender();};
    $('#h-sims').onclick=()=>simMany(fixturesOf(n.sid).filter(x=>x.playable&&!S.done[x.key]),'the rest of the series');
    $('#h-simn').onclick=openSimMore;
  }
  startHereWire();
  $('#hof-go')&&($('#hof-go').onclick=()=>{RK_F.tab='legends';go('rank');});
  $('#h-test').onclick=()=>openTestCreator();
  $('#h-friendly').onclick=openFriendly;
  $('#h-simto')&&($('#h-simto').onclick=simToMyMatch);
  $$('[data-playkey]').forEach(b=>b.onclick=()=>startFixture(b.dataset.playkey));
};
function driftCard(){
  if(!HAS_REAL||S.settings.history==='off')return'';
  const D=timelineDrift();if(!D.n)return'';
  return`<div class="card"><div class="spread"><h3 style="margin:0">Your timeline v history</h3><b class="num">${Math.round(100*D.same/D.n)}% as it happened</b></div>
    <div class="bar" style="margin:8px 0"><i style="width:${(100*D.same/D.n).toFixed(1)}%"></i></div>
    <div class="sub">${D.same} of ${D.n} results went the way they really did. Latest changes to history:</div>
    ${D.changed.slice(-4).reverse().map(E=>`<div class="spread" data-mid="${E.id}" style="cursor:pointer;margin-top:4px"><span>${badge(E.result.winner)} beat ${badge(otherOf(E,E.result.winner))} <span class="muted">${fmtDate(E.date)}</span></span><span class="muted" style="font-size:12px">really: ${esc(realText(realOf(E)))}</span></div>`).join('')}
    <button class="btn sm" style="margin-top:8px" data-go="history" data-arg="changed">All changed results</button></div>`;
}
function miniTable(sid){
  const E=edition(sid);if(!E)return'';
  const res=editionResults(sid);if(!res.size)return'';
  const st=E.hasSuper&&leagueComplete(E,'group')?superTable(E):null;
  const tabs=st?[{g:superName(E),rows:st}]:groupTables(E).map(t=>({g:E.labels.length>1?'Group '+t.g:'Table',rows:t.rows}));
  return`<div class="card"><div class="spread"><h3 style="margin:0">${esc(E.s.title)}</h3><button class="btn sm" data-go="tour" data-arg="${esc(sid)}">Tournament Centre</button></div>
    <div class="grid ${tabs.length>1?'g2':''}" style="margin-top:8px">${tabs.slice(0,4).map(t=>`<div><div class="sub" style="font-size:12px">${esc(t.g)}</div><table class="num">${t.rows.slice(0,6).map(r=>`<tr><td>${badge(r.team)}</td><td class="r">${r.p}</td><td class="r"><b>${r.pts}</b></td><td class="r muted">${r.nrr>=0?'+':''}${r.nrr.toFixed(2)}</td></tr>`).join('')}</table></div>`).join('')}</div></div>`;
}

// ---------- bulk sim ----------
let SIM_STOP=false;
const SIM_NEWS={pos:0,aw:[]};
function simMany(list,what){
  if(!list.length){toast('Nothing to sim.');return;}
  if(S.live&&S.live.state!=='done'&&list.some(x=>x.key===S.live.key))S.live=null;
  SIM_STOP=false;SIM_NEWS.pos=0;SIM_NEWS.aw=[];
  if(S.coach)S.coach.stop=null;   // only stop for what happens during this sim
  let i=0,ms0=S.ms.length;
  openModal(`<h2>Simulating ${esc(what)}</h2><div class="bar" style="margin:10px 0"><i id="sim-bar" style="width:0"></i></div><div id="sim-txt" class="sub">Starting…</div><div class="row" style="margin-top:12px"><button class="btn" id="sim-stop">Stop</button></div>`);
  $('#sim-stop').onclick=()=>{SIM_STOP=true;};
  const tick=()=>{
    const t0=Date.now();
    while(i<list.length&&Date.now()-t0<60&&!SIM_STOP){
      const fx=fixtureByKey(list[i].key);
      if(fx&&!S.done[fx.key]){const M=simFixture(fx);$('#sim-txt')&&($('#sim-txt').textContent=`${fmtDate(fx.date)} - ${M.result.text}`);}
      i++;
      if(S.coach&&S.coach.stop){SIM_STOP=true;}
    }
    $('#sim-bar')&&($('#sim-bar').style.width=(100*i/list.length)+'%');
    if(i<list.length&&!SIM_STOP)setTimeout(tick,0);
    else if(S.coach&&S.coach.stop){const why=S.coach.stop;S.coach.stop=null;saveGame();closeModal();toast(why==='offer'?'A job offer has come in.':'Your job has ended.','warn');go('coach');}
    else{saveGame();closeModal();
      if(SIM_NEWS.aw.length)openModal(`<h2>Season review</h2><div class="stack">${honoursHTML(SIM_NEWS.aw)}</div>`);
      toast(`Simmed ${i} ${i===1?'match':'matches'}. ${S.ms.length-ms0} new milestones${SIM_NEWS.pos?`, ${SIM_NEWS.pos} players of the series`:''}.`);rerender();}
  };
  setTimeout(tick,30);
}
function openSimMore(){
  const n=nextFixture();if(!n)return;
  openModal(`<h2>Sim ahead</h2><div class="stack">
    <div class="row"><input type="number" id="sm-n" value="10" min="1" max="3000" style="width:90px"><button class="btn pri" id="sm-go-n">Sim next N matches</button></div>
    <div class="row"><input type="date" id="sm-d" value="${addDays(n.date,90)}"><button class="btn pri" id="sm-go-d">Sim up to this date</button></div>
    <div class="row"><button class="btn" id="sm-yr">Sim to the end of ${n.date.slice(0,4)}</button></div>
    <p class="muted">Quick sims use automatic dice and AI captains. Stats, records and milestones all count.</p></div>`);
  const up=allFixtures().filter(x=>x.playable&&!S.done[x.key]);
  $('#sm-go-n').onclick=()=>simMany(up.slice(0,clamp(+$('#sm-n').value||1,1,5000)),'the next '+$('#sm-n').value+' matches');
  $('#sm-go-d').onclick=()=>{const d=$('#sm-d').value;simMany(up.filter(x=>x.date<=d),'to '+fmtDate(d));};
  $('#sm-yr').onclick=()=>{const y=n.date.slice(0,4);simMany(up.filter(x=>x.date.slice(0,4)===y),'the rest of '+y);};
}
function openTestCreator(fmt='TEST'){
  const d=(nextFixture()||{date:careerDate()}).date;
  const pool=fmt==='TEST'?TEST_TEAMS:ALL_TEAMS;
  const opts=sel=>pool.map(t=>`<option value="${t}" ${t===sel?'selected':''}>${esc(teamName(t))}</option>`).join('');
  const my=S.settings.myTeam&&pool.includes(S.settings.myTeam)?S.settings.myTeam:4;
  openModal(`<h2>Schedule a series</h2><div class="stack">
    <div class="seg">${INTL.map(f=>`<button data-tsf="${f}" class="${f===fmt?'on':''}">${SERIES_SUFFIX[f]}</button>`).join('')}</div>
    <div class="row"><label>Hosts <select id="ts-a">${opts(my)}</select></label>
      <label>Tourists <select id="ts-b">${opts(my===1?4:1)}</select></label></div>
    <div class="row"><label>${SERIES_SUFFIX[fmt]} <select id="ts-n">${(fmt==='TEST'?[1,2,3,4,5]:[1,2,3,4,5,6,7]).map(k=>`<option ${k===3?'selected':''}>${k}</option>`).join('')}</select></label>
      <label>First match <input type="date" id="ts-d" value="${fmt==='T20'&&d<T20_START?T20_START:d}"></label></div>
    <p class="muted">Squads come from each side's real XI nearest the date (you can swap players before each match). Grounds are the hosts' home venues.${fmt==='T20'?' T20 uses two provisional fast cards, RR_8 and RR_9 (see How to play).':''}</p>
    <button class="btn pri" id="ts-go">Create series</button></div>`);
  $$('[data-tsf]').forEach(b=>b.onclick=()=>openTestCreator(b.dataset.tsf));
  $('#ts-go').onclick=()=>{
    const a=+$('#ts-a').value,b=+$('#ts-b').value;if(a===b){toast('Pick two different teams.','warn');return;}
    const T=createSeries({fmt,a,b,n:+$('#ts-n').value,start:$('#ts-d').value||d});
    saveGame();closeModal();toast(esc(T.title)+' scheduled.');rerender();
  };
}

// A one-off match between any two sides, any format, any date - for two players at one screen.
function openFriendly(){
  const opts=sel=>ALL_TEAMS.map(t=>`<option value="${t}" ${t===sel?'selected':''}>${esc(teamName(t))}</option>`).join('');
  openModal(`<h2>Friendly</h2><p class="sub">Any two sides, squads as they were on the date. Two players can take a side each and roll their own dice. It doesn't count in your career.</p>
    <div class="stack"><div class="row"><label>Home <select id="fr-a">${opts(4)}</select></label><label>Away <select id="fr-b">${opts(1)}</select></label></div>
    <div class="row"><div class="seg">${INTL.map(f=>`<button data-frf="${f}" class="${f==='ODI'?'on':''}">${FMT_NAME[f]}</button>`).join('')}</div>
      <label>Date <input type="date" id="fr-d" value="${careerDate()}"></label></div>
    <button class="btn pri" id="fr-go">Team sheets</button></div>`);
  let fmt='ODI';
  $$('[data-frf]').forEach(b=>b.onclick=()=>{fmt=b.dataset.frf;$$('[data-frf]').forEach(x=>x.classList.toggle('on',x===b));});
  $('#fr-go').onclick=()=>{
    const a=+$('#fr-a').value,b=+$('#fr-b').value;if(a===b){toast('Pick two different sides.','warn');return;}
    let d=$('#fr-d').value||careerDate();if(fmt==='T20'&&d<T20_START)d=T20_START;
    const v=(HOME_VENUES.get(a)||[{venue:teamName(a)+' Oval',city:''}])[0];
    closeModal();
    startFixture('F'+Date.now(),{key:'F'+Date.now(),fmt,date:d,a,b,venue:v.venue,city:v.city,sid:null,title:'Friendly',label:FMT_NAME[fmt]+' friendly',playable:true,custom:true,friendly:true});
  };
}

// ---------- fixtures ----------
let FX_F={year:null,team:'',fmt:'',status:'up'};
RENDER.fixtures=(el)=>{
  const all=allFixtures();
  if(FX_F.year===null)FX_F.year=(nextFixture()||all[all.length-1]).date.slice(0,4);
  const years=[...new Set(all.map(x=>x.date.slice(0,4)))];
  const teams=[...TEAMS.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const list=all.filter(x=>(!FX_F.year||x.date.startsWith(FX_F.year))&&(!FX_F.team||x.a===+FX_F.team||x.b===+FX_F.team)&&(!FX_F.fmt||x.fmt===FX_F.fmt)
    &&(FX_F.status==='all'||(FX_F.status==='up'?!S.done[x.key]:!!S.done[x.key])));
  const groups=[];for(const x of list){const g=groups[groups.length-1];if(g&&g.sid===x.sid)g.items.push(x);else groups.push({sid:x.sid,title:x.title,items:[x]});}
  const byId=new Map(S.matches.map(E=>[E.id,E]));
  el.innerHTML=`<div class="card"><div class="row">
    <select id="fx-y"><option value="">All years</option>${years.map(y=>`<option ${y===FX_F.year?'selected':''}>${y}</option>`).join('')}</select>
    <select id="fx-t"><option value="">All teams</option>${teams.map(t=>`<option value="${t.id}" ${+FX_F.team===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select>
    <div class="seg">${[['','All'],['ODI','ODI'],['TEST','Test'],['T20','T20']].map(([k,n])=>`<button data-ff="${k}" class="${FX_F.fmt===k?'on':''}">${n}</button>`).join('')}</div>
    <div class="seg">${[['up','Upcoming'],['done','Played'],['all','All']].map(([k,n])=>`<button data-fs="${k}" class="${FX_F.status===k?'on':''}">${n}</button>`).join('')}</div>
    <button class="btn" id="fx-test">+ Series</button></div></div>
  <div class="stack" style="margin-top:14px">${groups.slice(0,80).map(g=>{
    const ss=seriesStatus(g.sid),tour=(SERIES.get(g.sid)||{}).kind==='tournament'||!!cupById(g.sid);
    const T=S.tests.find(t=>t.id===g.sid);
    return`<div class="card"><div class="spread"><div><b>${esc(g.title)}</b> <span class="muted">${ss&&!tour?esc(ss.text):''}</span></div>
      <div class="row">${tour?`<button class="btn sm" data-go="tour" data-arg="${esc(g.sid)}">Tournament Centre</button>`:''}${T&&!T.fix.some(x=>S.done[x.key])?`<button class="btn sm" data-deltest="${T.id}">Remove</button>`:''}</div></div>
      <div class="tbl-wrap"><table>${g.items.map(x=>{const E=S.done[x.key]&&byId.get(S.done[x.key]);const[a,b]=E?E.teams:fixtureTeams(x);
        const side=(t,k)=>t?badge(t):`<span class="pill">${esc(slotName(x.slots&&x.slots[k]))}</span>`;
        return`<tr ${E?`data-mid="${E.id}" style="cursor:pointer"`:''}><td class="muted num" style="white-space:nowrap">${fmtDate(x.date)}</td><td>${side(a,0)} v ${side(b,1)}</td>
        <td class="hide-sm sub" style="font-size:12px">${esc(!x.f||x.fmt==='TEST'?x.label:(x.f.mno?'Match '+x.f.mno:stageName(edition(x.sid)?.stageOf.get(x.f.no),edition(x.sid))||''))} · ${esc(x.venue)}</td>
        <td class="r">${E?`<span class="${E.result.winner?'green':'sub'}">${esc(E.result.text)}</span>`:x.cup&&!x.playable?'<span class="muted">to be decided</span>':x.playable?`<button class="btn sm pri" data-play="${x.key}">Play</button> <button class="btn sm" data-sim="${x.key}">Sim</button>`:'<span class="muted">no XI data</span>'}</td></tr>`;}).join('')}</table></div></div>`;}).join('')||'<div class="card empty">No fixtures match.</div>'}
  ${groups.length>80?`<div class="muted">Showing the first 80 series - narrow the filters to see more.</div>`:''}</div>`;
  $('#fx-y').onchange=e=>{FX_F.year=e.target.value;rerender();};
  $('#fx-t').onchange=e=>{FX_F.team=e.target.value;rerender();};
  $$('[data-ff]').forEach(b=>b.onclick=()=>{FX_F.fmt=b.dataset.ff;rerender();});
  $$('[data-fs]').forEach(b=>b.onclick=()=>{FX_F.status=b.dataset.fs;rerender();});
  $$('[data-play]').forEach(b=>b.onclick=()=>startFixture(b.dataset.play));
  $$('[data-sim]').forEach(b=>b.onclick=()=>{const M=quickSim(b.dataset.sim);toast(esc(M.result.text));rerender();});
  $$('[data-deltest]').forEach(b=>b.onclick=()=>{if(deleteTestSeries(b.dataset.deltest)){saveGame();rerender();}});
  $('#fx-test').onclick=()=>openTestCreator();
};
