// ═══ FRANCHISE LEAGUE SCREEN — found it, run the auction, follow the season ═══
const money=v=>'$'+(Math.round(v*10)/10).toFixed(1)+'m';
function lotHTML(L){
  const A=L.auction,lot=A.lot;if(!lot)return'<div class="card empty">Auction complete.</div>';
  const date=A.year+'-03-01',a=pAttr(lot.pid,date),me=L.teams[L.mine],inc=lot.bid<5?.5:1,next=lot.lead?lot.bid+inc:lot.bid,v=playerValue(lot.pid,date);
  const line=[['T20','T20I'],['ODI','ODI'],['LEAGUE','League']].map(([f,n])=>[n,S.stats[f][lot.pid]]).filter(x=>x[1])
    .map(([n,x])=>`${n}: ${x.m} m, ${x.r} runs${x.bw?`, ${x.bw} wkts`:''}`).join(' · ')||'uncapped';
  return`<div class="card hi stack"><div class="spread"><div><div class="sub">Lot ${A.i} of ${A.pool.length}</div><h2 style="margin:2px 0">${plink(lot.pid)}</h2>
      <div class="row">${badge(nationOf(lot.pid))}${overseas(L.mine,lot.pid)?'<span class="pill">overseas</span>':'<span class="pill win">home player</span>'}
        ${batChip((a.bat||'G')[0])} <span class="muted">${a.style==='N'?'batter':STYLE_NAME[a.style]+' bowler, rating '+Math.min(a.rating,5)}</span></div>
      <div class="muted" style="font-size:12px;margin-top:4px">${line}</div></div>
    <div style="text-align:right"><div class="sub">${lot.lead?'Current bid':'Base price'}</div><div class="result-big">${money(lot.bid)}</div>
      <div class="sub">${lot.lead?esc(L.teams[lot.lead].name):'no bids yet'}</div><div class="muted" style="font-size:12px">value ${'★'.repeat(Math.max(1,Math.min(5,Math.round(v/2.4))))}</div></div></div>
    <div class="row"><button class="btn pri" id="au-bid" ${canBuy(me,lot.pid,next)&&lot.lead!==L.mine?'':'disabled'}>Bid ${money(next)}</button>
      <button class="btn" id="au-pass">${lot.lead===L.mine?'Sold!':'Pass'}</button><button class="btn" id="au-sim">Let the AI bid for me</button></div>
    <div class="muted" style="font-size:12px">Your purse ${money(me.purse)} · squad ${me.squad.length}/${LG_SQUAD} · overseas ${overseasCount(me)}/${LG_OVERSEAS} (4 can play)</div></div>`;
}
function teamsTable(L){
  return`<table class="num"><tr><th>Franchise</th><th class="r">Squad</th><th class="r">Overseas</th><th class="r">Purse</th><th class="r hide-sm">Titles</th></tr>${Object.values(L.teams).map(T=>`<tr class="${T.id===L.mine?'me':''}"><td>${tlabel(T.id)}</td><td class="r">${T.squad.length}</td><td class="r">${overseasCount(T)}</td><td class="r">${money(T.purse)}</td><td class="r hide-sm">${T.titles.length}</td></tr>`).join('')}</table>`;
}
function squadHTML(L,T,date){
  return`<table><tr><th>Player</th><th class="hide-sm">Country</th><th>Role</th><th class="r">League M</th><th class="r">Runs</th><th class="r">Wkts</th></tr>${T.squad.map(p=>{const a=pAttr(p,date),s=S.stats.LEAGUE[p]||{};
    return`<tr><td>${plink(p)} ${overseas(T.id,p)?'<span class="pill">OS</span>':''} ${genP(p)?.domestic?'<span class="pill">domestic</span>':''}</td><td class="hide-sm">${badge(nationOf(p))}</td><td class="muted" style="font-size:12px">${a.style==='N'?'Batter':STYLE_NAME[a.style]+' r'+Math.min(a.rating,5)} ${batChip((a.bat||'G')[0])}</td>
      <td class="r num">${s.m||0}</td><td class="r num">${s.r||0}</td><td class="r num">${s.bw||0}</td></tr>`;}).join('')}</table>`;
}
RENDER.league=(el)=>{
  const L=league();
  if(!L){
    const y=+careerDate().slice(0,4),start=careerDate()>y+'-03-20'?y+1:y;
    el.innerHTML=`<div class="card stack" style="max-width:720px"><h2>Found a franchise league</h2>
      <p class="sub">Eight franchises, a player auction every year and a T20 season every April. You own one franchise and bid against seven AI owners; they keep it apart from international cricket in the stats.</p>
      <div class="row"><label>Host country <select id="lg-host">${TEST_TEAMS.map(t=>`<option value="${t}" ${t===3?'selected':''}>${esc(teamName(t))}</option>`).join('')}</select></label>
        <label>Your franchise <select id="lg-mine">${FRANCHISES.map(f=>`<option value="${f[0]}">${esc(f[1])}</option>`).join('')}</select></label>
        <label>First season <input type="number" id="lg-y" value="${Math.max(start,2003)}" min="2003" style="width:90px"></label></div>
      <div class="muted" style="font-size:12px">Purse ${money(LG_PURSE)} · ${LG_SQUAD} players · up to ${LG_OVERSEAS} overseas (4 in an XI) · keep up to 4 players each new season.</div>
      <button class="btn pri" id="lg-go">Found the league and go to the auction</button></div>`;
    $('#lg-go').onclick=()=>{foundLeague({host:+$('#lg-host').value,mine:+$('#lg-mine').value,year:+$('#lg-y').value});saveGame();rerender();};
    return;
  }
  const me=L.teams[L.mine],date=careerDate();
  if(L.auction){
    const recent=L.auction.log.slice(-8).reverse();
    el.innerHTML=`<div class="stack"><div class="card"><h2 style="margin:0">${L.auction.year} auction</h2><div class="sub">${tlabel(L.mine)} · ${esc(teamName(L.host))}-hosted league</div></div>
      ${lotHTML(L)}<div class="grid g2" style="align-items:start"><div class="card">${teamsTable(L)}</div>
      <div class="card"><h3>Recent lots</h3>${recent.map(([p,t,pr])=>`<div class="spread"><span>${plink(p)}</span><span class="${t===L.mine?'green':'muted'}">${t?esc(teamShort(t))+' '+money(pr):'unsold'}</span></div>`).join('')||'<span class="muted">-</span>'}</div></div>
      <div class="card"><h3>Your squad</h3>${squadHTML(L,me,L.auction.year+'-03-01')}</div></div>`;
    $('#au-bid')&&($('#au-bid').onclick=()=>{userBid();saveGame();rerender();});
    $('#au-pass')&&($('#au-pass').onclick=()=>{userPass();saveGame();rerender();});
    $('#au-sim').onclick=()=>{simAuction();saveGame();rerender();};
    return;
  }
  const years=Object.keys(L.seasons).map(Number).sort(),cur=years[years.length-1],season=L.seasons[cur],cup=cupById(season.cup);
  const table=cup?tableFrom(cupMatches(cup).filter(E=>/^League/.test(E.stage)),cup.teams):[];
  const nx=cup&&allFixtures().find(x=>x.sid===cup.id&&x.playable&&!S.done[x.key]);
  const done=cup&&cup.fix.every(f=>S.done[f.key]);
  const retain=done&&!L.seasons[cur+1];
  el.innerHTML=`<div class="stack"><div class="card"><div class="spread"><div><h2 style="margin:0">${cur} Franchise League</h2><div class="sub">${tlabel(L.mine)} · hosted in ${esc(teamName(L.host))}</div></div>
      <div class="row">${nx?`<button class="btn pri" data-playkey="${nx.key}">Play next: ${esc(teamShort(nx.a))} v ${esc(teamShort(nx.b))}</button><button class="btn" id="lg-sim">Sim the season</button>`:''}<button class="btn" data-go="tour" data-arg="${cup?cup.id:''}">Bracket</button></div></div>
      ${done&&season.champ?`<div class="banner" style="margin-top:10px">🏆 ${cur} champions: <b>${tlabel(season.champ)}</b></div>`:''}</div>
    ${retain?`<div class="card stack"><h3>Retain up to four for ${cur+1}</h3><div class="sub">Kept players cost ${LG_RETAIN.map(money).join(', ')} from next year's purse; everyone else goes back into the auction.</div>
      <div class="grid g3">${me.squad.map(p=>`<label class="row" style="gap:6px"><input type="checkbox" data-keep="${p}" ${(L.keep||[]).includes(p)?'checked':''}> ${esc(pName(p))}</label>`).join('')}</div>
      <button class="btn pri" id="lg-auction">Start the ${cur+1} auction</button><div class="muted" style="font-size:12px">It opens on its own in January and runs itself by late March if you don't.</div></div>`:''}
    <div class="grid g2" style="align-items:start"><div class="card">${table.length?tableHTML(table,(t,i)=>i<4,'League table'):''}</div><div class="card">${teamsTable(L)}</div></div>
    <div class="card"><h3>Your squad</h3>${squadHTML(L,me,date)}</div>
    <div class="card"><h3>History</h3>${L.log.slice().reverse().slice(0,12).map(x=>`<div>${esc(x.text)}${x.top?' Top buys: '+x.top.map(([p,t,pr])=>`${esc(pName(p))} (${esc(teamShort(t))}, ${money(pr)})`).join(', '):''}</div>`).join('')}</div></div>`;
  $$('[data-playkey]').forEach(b=>b.onclick=()=>startFixture(b.dataset.playkey));
  $('#lg-sim')&&($('#lg-sim').onclick=()=>{simCup(cup);ensureLeague();saveGame();rerender();});
  $$('[data-keep]').forEach(c=>c.onchange=()=>{const k=$$('[data-keep]:checked').map(x=>+x.dataset.keep);if(k.length>4){c.checked=false;toast('Four at most.','warn');return;}L.keep=k;saveGame();});
  $('#lg-auction')&&($('#lg-auction').onclick=()=>{startAuction(cur+1);saveGame();rerender();});
};
