// ═══ UI SHELL — navigation, views, modal, shared widgets ═══
const TEAM_COL={AUS:'#c9a400',IND:'#1f4fbf',ENG:'#1d3a8a',RSA:'#0f7a3e',PAK:'#0b6e2e',SL:'#173f8f',WI:'#7a1f2b',NZ:'#222',ZIM:'#b8341b',
  BAN:'#05683f',KEN:'#9c1b1b',IRE:'#169b62',NED:'#e8601c',SCO:'#1b3f94',CAN:'#c8102e',UAE:'#00732f',NAM:'#003580',USA:'#3c3b6e',NEP:'#dc143c',
  OMA:'#c8102e',PNG:'#b8860b',HK:'#c8102e',BER:'#00247d',JER:'#c8102e',AFR:'#6b4f1d',ASIA:'#4b2a7b',WXI:'#334155'};
for(const f of FRANCHISES)TEAM_COL[f[2]]=f[3];
// A national side shows its flag and code (07z-flags); composites, franchises and Settings -> Team badges 'Colours' keep the colour chip.
const badge=t=>{const c=teamShort(t),f=useFlags()&&flagSVG(c);
  return f?`<span class="tbadge fl" title="${esc(teamName(t))}">${f}${esc(c)}</span>`:`<span class="tbadge" style="background:${TEAM_COL[c]||'#334155'}">${esc(c)}</span>`;};
const tlabel=t=>`${badge(t)} ${esc(teamName(t))}`;
const plink=pid=>`<span class="plink" data-pid="${pid}" tabindex="0" role="link">${esc(pName(pid))}</span>`;
document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const t=e.target;if(t&&t.matches&&t.matches('.plink,[data-mid]')){e.preventDefault();t.click();}});
const VIEWS=[['home','Dashboard'],['match','Match'],['me','My player'],['coach','Coach'],['plan','Planner'],['play','Challenges'],['league','League'],['fixtures','Fixtures'],['tour','Tournament Centre'],['rank','Rankings'],['records','Records'],['query','Stats lab'],['players','Players'],['history','Results'],['miles','Milestones'],['settings','Settings']];
let VIEW='home',VIEW_ARG=null;
const RENDER={};

function go(v,arg){
  VIEW=v;VIEW_ARG=arg??null;
  renderNav();
  const el=$('#view');el.innerHTML='';
  try{RENDER[v](el,arg);}catch(e){console.error(e);el.innerHTML=`<div class="card red">Something went wrong drawing this screen: ${esc(e.message)}</div>`;}
  if(S&&S.sandbox&&v!=='play')el.insertAdjacentHTML('afterbegin',sandboxBanner());
  if(S)tourSeen(v);
  window.scrollTo?.(0,0);
}
function rerender(){go(VIEW,VIEW_ARG);}
function renderNav(){
  const live=S&&S.live&&S.live.state!=='done';
  $('#nav').innerHTML=S?VIEWS.filter(([k])=>k!=='me'||S.me).map(([k,n])=>`<button data-go="${k}" class="${VIEW===k?'on':''}">${n}${k==='match'&&live?'<span class="dot"></span>':''}</button>`).join(''):'';
  $('#clock').textContent=S?fmtDate(careerDate()):'';
}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g){if(g.closest('#modal'))closeModal();go(g.dataset.go,g.dataset.arg);return;}
  const p=e.target.closest('[data-pid]');if(p&&!e.target.closest('button')){openPlayer(+p.dataset.pid);return;}
  const m=e.target.closest('[data-mid]');if(m&&!e.target.closest('button')){openScorecard(m.dataset.mid);return;}
  const si=e.target.closest('[data-simg]');if(si){downloadCanvas(seasonImage(si.dataset.simg),`first-xi-${si.dataset.simg}-season.png`);return;}
  if(e.target.closest('.modal .x')||e.target.id==='modal')closeModal();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
function openModal(html,cls=''){$('#modal-box').className='modal-box '+cls;$('#modal-box').innerHTML='<button class="x" aria-label="Close">×</button>'+html;$('#modal').classList.remove('hidden');}
function closeModal(){$('#modal').classList.add('hidden');$('#modal-box').innerHTML='';}
const resultPill=(E,t)=>!E.result||!E.result.winner?`<span class="pill">${E.result?.type==='draw'?'D':E.result?.type==='tie'?'T':'NR'}</span>`:`<span class="pill ${E.result.winner===t?'win':'loss'}">${E.result.winner===t?'W':'L'}</span>`;
function innsShort(I,fmt){return`${I.runs}${I.wkts<10?'/'+I.wkts:''}${I.why==='declared'?'d':''}${fmt!=='TEST'||I.why!=='all out'?` <span class="muted">(${oversTxt(I.lb)})</span>`:''}`;}
function matchLine(E){
  const sc=t=>E.inns.filter(I=>I.bat===t).map(I=>innsShort(I,E.fmt)).join(' &amp; ')||'-';
  // batting order, so a rain-revised chase reads as one; the chasing side shows its D/L target
  const order=E.inns.length?[E.inns[0].bat,...E.teams.filter(t=>t!==E.inns[0].bat)]:E.teams;
  return`<div class="spread" data-mid="${E.id}" style="cursor:pointer">
    <div>${order.map((t,i)=>`<div class="row">${badge(t)} <span>${sc(t)}</span>${i===1&&E.dl?`<span class="muted" style="font-size:12px">target ${E.dl.target} (D/L)</span>`:''}</div>`).join('')}</div>
    <div style="text-align:right"><div class="${E.result.winner?'green':'sub'}">${esc(E.result.text)}</div><div class="muted" style="font-size:12px">${fmtDate(E.date)} · ${FMT_NAME[E.fmt]}${E.stage?' · '+esc(E.stage):''}</div></div></div>`;
}

// ---------- player profile ----------
function openPlayer(pid){
  const a=pAttr(pid),rows=FORMATS.map(f=>[f,S.stats[f][pid]]).filter(x=>x[1]),gp=genP(pid);
  const era=(WORLD.players[pid]||[])[7]||[],bowls=a.style!=='N';
  const recent=S.matches.filter(E=>E.teams.some(t=>E.xi[t].slice(0,11).includes(pid))).slice(-8).reverse();
  const ms=S.ms.filter(m=>m.pid===pid).slice(-10).reverse();
  const line=(E)=>{const parts=[];for(const I of E.inns){const b=I.bt.find(r=>r[0]===pid);if(b)parts.push(b[1]+(b[5]?'':'*'));const w=I.bw.find(r=>r[0]===pid);if(w)parts.push(w[4]+'/'+w[3]);}return parts.join(', ')||'dnb';};
  openModal(`<h2>${esc(pName(pid))}</h2>
  ${gp?`<div class="sub" style="margin:-6px 0 8px">Age ${ageOf(gp,careerDate())} · ${esc(teamName(gp.t))}${gp.real?'':` · potential ${'★'.repeat(6-gp.pot)}`}${gp.ret&&gp.ret<=careerDate()?` · <span class="red">retired ${gp.ret.slice(0,4)}</span>`:''}</div>`:''}
  <div class="row muted" style="margin-bottom:10px">${rows.length?rows[0][1].teams.map(badge).join(' '):''}
    <span>Batting: <b>${esc(a.bat?BAT_NAME[a.bat]:'by position')}</b> <span class="pill">${a.batSrc==='h'?'from your Excel BatGroup':a.batSrc==='e'?'edited':a.batSrc==='c'?'from real averages':a.batSrc==='g'?'new player':'derived'}</span></span>
    <span>Bowling: ${a.style==='N'?'does not bowl':`${STYLE_NAME[a.style]}, rating ${a.rating}${a.rating>=5?' (part-timer)':a.rating===1?' (elite)':''}`}
    <span class="pill">${a.src==='h'?'from your Excel ratings':a.src==='e'?'edited':'from real spells'}</span></span>
    <button class="btn sm" id="pa-edit">Edit</button><button class="btn sm" id="pa-cmp">Compare / graphs</button></div>
  ${era.length>1&&!S.attrEdits[pid]?`<div class="muted" style="font-size:12px;margin:-4px 0 10px">By season: ${era.map(e=>`${e[0]} ${bowls&&(WORLD.players[pid][4]!=='h')?'r'+e[1]+' ':''}${e[2]?batChip(e[2].length===2?e[2][0]:e[2]):''}`).join(' · ')}${a.era?' (as of '+fmtDate(careerDate()).slice(-4)+')':''}</div>`:''}
  <div id="pa-form" class="hidden card" style="margin-bottom:10px"><div class="row">
    <label>Style <select id="pa-style">${['P','S','M','N'].map(s=>`<option value="${s}" ${a.style===s?'selected':''}>${s==='N'?'Does not bowl':STYLE_NAME[s]}</option>`).join('')}</select></label>
    <label>Rating <select id="pa-rating">${[1,2,3,4,5].map(r=>`<option ${a.rating===r?'selected':''}>${r}</option>`).join('')}</select></label>
    <label>Max ODI overs <input type="number" id="pa-max" min="0" max="10" value="${a.max}" style="width:70px"></label>
    <label>Batting colour <select id="pa-bat">${[['','By position'],['B','BLUE'],['G','GREEN'],['R','RED'],['BG','BLUE (GREEN v Test nations)']].map(([v,n])=>`<option value="${v}" ${a.bat===v?'selected':''}>${n}</option>`).join('')}</select></label>
    <button class="btn pri sm" id="pa-save">Save</button><button class="btn sm" id="pa-reset">Reset</button></div>
    <div class="muted" style="font-size:12px;margin-top:6px">Rating 1 is elite, 5 a part-timer: it sets the run-rate card weights for every over he bowls. Batting colour is the wicket colour that can get him out: BLUE batters fall only to BLUE, GREEN to BLUE or GREEN, RED to anything.</div></div>
  ${rows.length?rows.map(([f,s])=>`<h3>${FMT_NAME[f]} career</h3><div class="tbl-wrap"><table class="num"><tr><th>M</th><th>Inn</th><th>NO</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>100</th><th>50</th><th>Wkts</th><th>BB</th><th>Avg</th><th>Econ</th><th>5w</th><th>Ct</th><th>St</th><th>MoM</th></tr>
    <tr><td>${s.m}</td><td>${s.inn}</td><td>${s.no}</td><td>${s.r}</td><td>${s.hs}${s.hsNo?'*':''}</td><td>${f2(batAvg(s))}</td><td>${f1(batSR(s))}</td><td>${s.c100}</td><td>${s.c50}</td><td>${s.bw}</td><td>${s.best[0]}/${s.best[1]}</td><td>${f2(bowlAvg(s))}</td><td>${f2(bowlEcon(s))}</td><td>${s.w5}</td><td>${s.ct}</td><td>${s.st}</td><td>${s.motm}</td></tr></table></div>`).join(''):'<p class="muted">Hasn\'t played in this career yet.</p>'}
  ${recent.length?`<h3>Recent matches</h3><table>${recent.map(E=>`<tr data-mid="${E.id}" style="cursor:pointer"><td>${fmtDate(E.date)}</td><td>${E.fmt}</td><td>v ${badge(otherOf(E,E.teams.find(t=>E.xi[t].slice(0,11).includes(pid))))}</td><td class="r num">${line(E)}</td></tr>`).join('')}</table>`:''}
  ${(()=>{const h=playerHonours(pid);return h.ranks.length||h.awards.length?`<h3>Rankings &amp; honours</h3>${h.ranks.map(x=>`<span class="pill" style="margin:0 4px 4px 0">${esc(x)}</span>`).join('')}${h.awards.map(x=>`<div>🏆 ${esc(x)}</div>`).join('')}`:'';})()}
  ${playerShotsHTML(pid)}
  ${nemesisHTML(pid)}
  ${(()=>{const st=storyOf(pid);return st.length>1?`<details style="margin-top:10px"><summary class="muted" style="cursor:pointer">Career story</summary>${st.map(([d,t])=>`<div><span class="muted">${fmtDate(d)}</span> ${esc(t)}</div>`).join('')}</details>`:'';})()}
  ${ms.length?`<h3>Milestones</h3>${ms.map(m=>`<div>🏅 ${esc(m.text)} <span class="muted">${fmtDate(m.date)} · ${m.fmt}</span></div>`).join('')}`:''}`);
  $('#pa-edit').onclick=()=>$('#pa-form').classList.toggle('hidden');
  $('#pa-cmp').onclick=()=>{Q_F.mode='cmp';Q_F.c1=pName(pid);Q_F.c2='';const f=FORMATS.find(f=>S.stats[f][pid]);if(f)Q_F.fmt=f;closeModal();go('query');};
  $('#pa-save').onclick=()=>{S.attrEdits[pid]={style:$('#pa-style').value,rating:+$('#pa-rating').value,max:clamp(+$('#pa-max').value,0,10),bat:$('#pa-bat').value};if(S.attrEdits[pid].style==='N')Object.assign(S.attrEdits[pid],{rating:7,max:0});saveGame();openPlayer(pid);};
  $('#pa-reset').onclick=()=>{delete S.attrEdits[pid];saveGame();openPlayer(pid);};
}
