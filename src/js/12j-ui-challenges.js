// ═══ CHALLENGES & ACHIEVEMENTS SCREEN ═══
let PLAY_TAB='list',RELIVE={team:0,side:'chase'};
function reliveHTML(){
  const all=famousMatches();
  if(!all.length)return`<div class="card stack" style="max-width:720px"><h3>Relive history</h3>
    <p class="sub">Start famous real ODIs from where they really stood - the real XIs, the real target, the real pair at the crease with ten, five, two or one overs left - and see if you can change history.</p>
    <p class="muted">This needs the real ball-by-ball data. Download <b>odis_json.zip</b> from cricsheet.org, then run <code>python3 tools/cricsheet_odis.py odis_json.zip</code> and <code>npm run build</code> (a Claude Code session can do it for you).</p></div>`;
  const teams=[...new Set(all.flatMap(x=>[x.f.a,x.f.b]))].sort((a,b)=>teamName(a).localeCompare(teamName(b)));
  const list=all.filter(x=>!RELIVE.team||x.f.a===RELIVE.team||x.f.b===RELIVE.team).reverse().slice(0,60),st=readStars();
  return`<div class="card"><div class="row"><select id="rl-team"><option value="0">All teams (${plural(all.length,'match','matches')})</option>${teams.map(t=>`<option value="${t}" ${t===RELIVE.team?'selected':''}>${esc(teamName(t))}</option>`).join('')}</select>
    <div class="seg">${[['chase','I bat (chase)'],['defend','I bowl (defend)']].map(([k,n])=>`<button data-rls="${k}" class="${RELIVE.side===k?'on':''}">${n}</button>`).join('')}</div></div></div>
    <div class="grid g2" style="margin-top:14px">${list.map(({f,R})=>{const bat=R.inn[1][0],bowl=R.inn[0][0];
      return`<div class="card stack"><div class="spread"><b>${badge(bowl)} ${R.inn[0][1]}/${R.inn[0][2]} · ${badge(bat)} chase</b><span class="pill">${FAM_NAME[R.fam]||''}</span></div>
      <div class="sub">${esc(R.ev||seriesOf(f).title)} · ${esc(f.venue)} · ${fmtDate(f.date)}</div><div class="muted" style="font-size:12px">In reality: ${esc(realText(R))}</div>
      <div class="row">${reliveMoments(R).map(p=>{const d=reliveDef(f,R,p,RELIVE.side),s=(st[d.id]||{}).stars||0;
        return`<button class="btn sm ${p===R.pos[0]?'pri':''}" data-rl="${f.cid}:${p[0]}" title="${esc(d.desc)}">${p===R.pos[0]?'Chase '+d.target:`${p[1]} off ${p[0]}, ${10-p[2]} wkts`}${s?' '+'★'.repeat(s):''}</button>`;}).join('')}</div></div>`;}).join('')}</div>`;
}
const starsHTML=n=>`<span class="gold" style="letter-spacing:2px">${'★'.repeat(n)}<span class="muted">${'★'.repeat(3-n)}</span></span>`;
function challengeCard(c,st){
  const s=(st[c.id]||{}).stars||0;
  return`<div class="card stack"><div class="spread"><b>${esc(c.title)}</b>${starsHTML(s)}</div>
    <div class="sub">${esc(c.desc)}</div>
    <div class="row muted" style="font-size:12px">${c.kind==='cup'?`${FMT_NAME[c.cup.fmt]} tournament · ${c.cup.teams.length} teams`:`${FMT_NAME[c.fmt]} · ${fmtDate(c.date)} · ${badge(c.bat)} v ${badge(c.bowl)}`}</div>
    <div class="row"><button class="btn pri sm" data-chal="${c.id}">Play</button><button class="btn sm" data-code="${c.id}">Share code</button></div></div>`;
}
function sandboxBanner(){
  if(!S||!S.sandbox)return'';
  return`<div class="banner" style="margin-bottom:14px"><div class="spread"><span>🧩 Challenge: <b>${esc(S.sandbox.def.title)}</b> - a sandbox, your career is safe.</span><button class="btn sm" id="sb-leave">Back to your career</button></div></div>`;
}
RENDER.play=(el)=>{
  const st=readStars(),A=readAch();
  let body='';
  if(PLAY_TAB==='list')body=`<div class="grid g3">${CHALLENGES.map(c=>challengeCard(c,st)).join('')}</div>`;
  else if(PLAY_TAB==='relive')body=reliveHTML();
  else if(PLAY_TAB==='dream')body=dreamHTML();
  else if(PLAY_TAB==='build'){
    const opts=sel=>ALL_TEAMS.filter(t=>!COMPOSITE.has(t)).map(t=>`<option value="${t}" ${t===sel?'selected':''}>${esc(teamName(t))}</option>`).join('');
    body=`<div class="card stack" style="max-width:720px"><h3>Build a scenario</h3>
      <div class="row"><div class="seg">${['ODI','T20'].map(f=>`<button data-bf="${f}" class="${f==='ODI'?'on':''}">${f}</button>`).join('')}</div>
        <label>Batting <select id="cb-bat">${opts(4)}</select></label><label>Bowling <select id="cb-bowl">${opts(1)}</select></label></div>
      <div class="row"><label>Date <input type="date" id="cb-d" value="2008-06-01"></label><label>Target <input type="number" id="cb-t" value="250" style="width:80px"></label>
        <label>Need <input type="number" id="cb-n" value="40" style="width:70px"></label><label>Overs left <input type="number" id="cb-o" value="5" style="width:60px"></label>
        <label>Wickets down <input type="number" id="cb-w" value="6" min="0" max="9" style="width:60px"></label></div>
      <div class="row"><label class="row" style="gap:6px"><input type="radio" name="cb-you" value="chase" checked> I bat (chase)</label><label class="row" style="gap:6px"><input type="radio" name="cb-you" value="defend"> I bowl (defend)</label>
        <input type="text" id="cb-title" placeholder="Name it" value="My scenario"></div>
      <div class="row"><button class="btn pri" id="cb-play">Play it</button><button class="btn" id="cb-code">Get a share code</button></div>
      <h3 style="margin-top:12px">Got a code from a friend?</h3>
      <div class="row"><input type="text" id="cb-in" placeholder="FXI1...." style="flex:1"><button class="btn" id="cb-go">Play code</button></div></div>`;
  }else{
    const got=ACHIEVEMENTS.filter(a=>A[a[0]]).length;
    body=`<div class="card"><div class="spread"><h3 style="margin:0">Trophy cabinet</h3><b class="num">${got} / ${ACHIEVEMENTS.length}</b></div>
      <div class="bar" style="margin:8px 0 14px"><i style="width:${100*got/ACHIEVEMENTS.length}%"></i></div>
      <div class="grid g4">${ACHIEVEMENTS.map(a=>`<div class="card" style="padding:10px;${A[a[0]]?'':'opacity:.4;filter:grayscale(1)'}"><div style="font-size:26px">${a[1]}</div><b>${esc(a[2])}</b><div class="sub" style="font-size:12px">${esc(a[3])}</div>${A[a[0]]?`<div class="muted" style="font-size:11px">${fmtDate(A[a[0]])}</div>`:''}</div>`).join('')}</div></div>`;
  }
  el.innerHTML=sandboxBanner()+`<div class="card"><div class="seg">${[['list','Challenges'],['relive','Relive history'],['dream','Dream XIs'],['build','Build your own'],['ach','Achievements']].map(([k,n])=>`<button data-pt="${k}" class="${PLAY_TAB===k?'on':''}">${n}</button>`).join('')}</div></div>
    <div style="margin-top:14px">${body}</div>`;
  $$('[data-pt]').forEach(b=>b.onclick=()=>{PLAY_TAB=b.dataset.pt;rerender();});
  $$('[data-chal]').forEach(b=>b.onclick=()=>startChallenge(challengeById(b.dataset.chal)));
  $$('[data-code]').forEach(b=>b.onclick=()=>showCode(challengeById(b.dataset.code)));
  if(PLAY_TAB==='dream')dreamWire();
  $('#rl-team')&&($('#rl-team').onchange=e=>{RELIVE.team=+e.target.value;rerender();});
  $$('[data-rls]').forEach(b=>b.onclick=()=>{RELIVE.side=b.dataset.rls;rerender();});
  $$('[data-rl]').forEach(b=>b.onclick=()=>{const[cid,bl]=b.dataset.rl.split(':'),f=FIX.find(x=>x.cid===cid),R=WORLD.real[cid],p=R.pos.find(x=>x[0]===+bl);startChallenge(reliveDef(f,R,p,RELIVE.side));});
  if(PLAY_TAB==='build'){
    let fmt='ODI';$$('[data-bf]').forEach(b=>b.onclick=()=>{fmt=b.dataset.bf;$$('[data-bf]').forEach(x=>x.classList.toggle('on',x===b));});
    const read=()=>{const kind=document.querySelector('input[name=cb-you]:checked').value,o=clamp(+$('#cb-o').value||1,1,fmt==='T20'?20:50);
      const t=Math.max(2,+$('#cb-t').value||200),need=clamp(+$('#cb-n').value||1,1,t);
      return{id:'custom-'+Date.now().toString(36),title:$('#cb-title').value.trim()||'My scenario',desc:`${teamName(+$('#cb-bat').value)} need ${need} off ${o} overs with ${clamp(+$('#cb-w').value,0,9)} down.`,
        kind,fmt,bat:+$('#cb-bat').value,bowl:+$('#cb-bowl').value,date:$('#cb-d').value||'2008-06-01',target:t,need,balls:o*6,wkts:clamp(+$('#cb-w').value,0,9)};};
    $('#cb-play').onclick=()=>{const d=read();if(d.bat===d.bowl){toast('Pick two different sides.','warn');return;}startChallenge(d);};
    $('#cb-code').onclick=()=>showCode(read());
    $('#cb-go').onclick=()=>{const d=parseChallengeCode($('#cb-in').value);if(!d){toast('That code doesn\'t look right.','bad');return;}startChallenge(d);};
  }
};
function showCode(def){
  const code=challengeCode(def);
  openModal(`<h2>${esc(def.title)}</h2><p class="sub">Send this code to a friend - they paste it under Challenges → Build your own.</p>
    <textarea readonly style="width:100%;height:90px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px;font-family:var(--mono)">${esc(code)}</textarea>
    <div class="row" style="margin-top:8px"><button class="btn pri" id="cc-copy">Copy</button></div>`);
  $('#cc-copy').onclick=()=>{try{navigator.clipboard.writeText(code);toast('Copied.');}catch(e){$('textarea').select();}};
}
document.addEventListener('click',e=>{if(e.target.closest('#sb-leave')){leaveSandbox();go(S?'play':'home');if(!S)showSplash();}});
