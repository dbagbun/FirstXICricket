// ═══ DREAM XIs — draft from any era, every man at his peak, and play it out in the sandbox ═══
// A dream match is a challenge (kind 'dream') with two picked XIs: in the sandbox each player's attributes are set
// (S.attrEdits) to his peak - his best bowling rating and best batting colour across the era table - so a 2003
// opener can face a 2023 quick. Real caps (appearances in the real XIs) rank the presets and break ties.
const DREAM_DATE='2016-06-15';
let REAL_CAPS=null;
function realCaps(pid){
  if(!REAL_CAPS){REAL_CAPS=new Map();for(const sides of Object.values(WORLD.xi))for(const l of Object.values(sides))l.slice(0,11).forEach(p=>REAL_CAPS.set(p,(REAL_CAPS.get(p)||0)+1));}
  return REAL_CAPS.get(+pid)||0;
}
const COL_BEST={B:0,BG:1,G:2,GR:3,R:4};
let KEPT=null;
function keptCount(pid){if(!KEPT){KEPT=new Map();for(const sides of Object.values(WORLD.xi))for(const x of Object.values(sides)){const k=x[x[11]];KEPT.set(k,(KEPT.get(k)||0)+1);}}return KEPT.get(+pid)||0;}
function peakAttr(pid){
  const p=WORLD.players[pid];if(!p)return pAttr(pid);
  const era=p[7]||[],ratings=[p[2],...era.map(e=>e[1])].filter(r=>r!=null),cols=[p[5],...era.map(e=>e[2])].filter(Boolean);
  const bat=cols.sort((a,b)=>(COL_BEST[a]??9)-(COL_BEST[b]??9))[0]||'';
  // a short spell can rank elite for a year: the peak is at most one step better than the whole career
  return{style:p[1],rating:p[1]==='N'?7:Math.max(Math.min(...ratings),(p[2]>5?5:p[2])-1,1),max:p[3],bat};
}
function dreamSearch(q,n=12){
  q=String(q||'').trim().toLowerCase();if(q.length<2)return[];
  const out=[];for(const pid in WORLD.players){const nm=WORLD.players[pid][0];if(nm.toLowerCase().includes(q))out.push(+pid);}
  return out.sort((a,b)=>realCaps(b)-realCaps(a)).slice(0,n);
}
// A nation's best of all time on paper: six batters, a keeper, four bowlers.
function dreamPreset(team){
  nationMaps();
  const pool=Object.keys(WORLD.players).map(Number).filter(p=>NATION.get(p)===+team&&realCaps(p)>=15);
  const A=p=>peakAttr(p),bat=p=>(4-(COL_BEST[A(p).bat]??4))*30+Math.min(60,realCaps(p)/4),bowl=p=>A(p).style==='N'?-1:(6-A(p).rating)*30+Math.min(60,realCaps(p)/4);
  const used=new Set(),take=(arr,n,f)=>arr.filter(p=>!used.has(p)).sort((a,b)=>f(b)-f(a)).slice(0,n).map(p=>{used.add(p);return p;});
  const keeper=take(pool.filter(p=>keptCount(p)>=10),1,p=>bat(p)+keptCount(p))[0];
  const bowlers=take(pool.filter(p=>A(p).style!=='N'&&A(p).rating<=3),4,bowl);
  const batters=take(pool.filter(p=>A(p).style==='N'||A(p).rating>3),6,bat);
  return dreamOrder([...batters,keeper,...bowlers].filter(Boolean));
}
// Batting order: batters by colour, the keeper at 7 (or after the batters), bowlers last by how they bat.
function dreamOrder(xi){
  const A=p=>peakAttr(p),bowler=p=>A(p).style!=='N'&&A(p).rating<=3;
  const keeper=xi.slice().sort((a,b)=>keptCount(b)-keptCount(a)).find(p=>keptCount(p)>=5)??null;
  const bats=xi.filter(p=>p!==keeper&&!bowler(p)).sort((a,b)=>(COL_BEST[A(a).bat]??4)-(COL_BEST[A(b).bat]??4)||realCaps(b)-realCaps(a));
  const bowls=xi.filter(p=>p!==keeper&&bowler(p)).sort((a,b)=>(COL_BEST[A(a).bat]??4)-(COL_BEST[A(b).bat]??4));
  return[...bats,...(keeper!=null?[keeper]:[]),...bowls];
}
function dreamXI(list){
  const bat=dreamOrder(list).slice(0,11);
  const wk=bat.slice().sort((a,b)=>keptCount(b)-keptCount(a))[0],cap=bat.slice().sort((a,b)=>realCaps(b)-realCaps(a))[0];
  return{bat,wk,cap};
}
// The match, in the sandbox: peak attributes as edits, a neutral ground, you captain the first side.
function buildDreamMatch(def){
  for(const p of[...def.a,...def.b]){const x=peakAttr(p);S.attrEdits[p]={style:x.style,rating:x.rating,max:x.max,bat:x.bat};}
  const M=newMatch({fmt:def.fmt,a:def.ta,b:def.tb,date:DREAM_DATE,venue:"Lord's",city:'London',series:'Dream XIs: '+def.title,stage:'',
    xiA:dreamXI(def.a),xiB:dreamXI(def.b),home:0});
  M.noWeather=true;M.challenge=def;M.key='CH.'+def.id;M.mods={bat:{},bowl:{}};M.dream=true;
  M.manualCaptain={[def.ta]:true};M.you=def.ta;
  return M;
}
// ---------- the Dream XIs tab (Challenges) ----------
const DREAM_KEY='fxi_dream';
let DREAM=(()=>{try{return JSON.parse(localStorage.getItem(DREAM_KEY))||null;}catch(e){return null;}})()||{a:[],b:[],ta:28,tb:27,fmt:'ODI'};
const dreamSave=()=>{try{localStorage.setItem(DREAM_KEY,JSON.stringify(DREAM));}catch(e){}};
function dreamDef(){
  const n=t=>teamName(t);
  return{id:'dream-'+[...DREAM.a,...DREAM.b].reduce((h,p)=>(h*31+p)>>>0,7).toString(36),kind:'dream',title:`${n(DREAM.ta)} v ${n(DREAM.tb)}`,
    desc:'Two dream XIs, every man at his peak.',fmt:DREAM.fmt,ta:DREAM.ta,tb:DREAM.tb,a:DREAM.a.slice(),b:DREAM.b.slice(),bat:DREAM.tb,bowl:DREAM.ta,date:DREAM_DATE};
}
function dreamSideHTML(k){
  const L=DREAM[k],t=DREAM[k==='a'?'ta':'tb'],teams=[...TEAMS.values()].filter(x=>x.id<100);
  const A=p=>peakAttr(p);
  return`<div class="card stack"><div class="spread"><select data-dt="${k}">${teams.map(x=>`<option value="${x.id}" ${x.id===t?'selected':''}>${esc(x.name)}</option>`).join('')}</select><b class="num">${L.length}/11</b></div>
    <div class="row"><select data-dp="${k}"><option value="">Load a nation's best…</option>${TEST_TEAMS.concat([12,13,14,15]).map(x=>`<option value="${x}">${esc(teamName(x))}</option>`).join('')}</select>${L.length?`<button class="btn sm" data-dclr="${k}">Clear</button>`:''}</div>
    <div>${dreamOrder(L).map((p,i)=>{const a=A(p);return`<div class="spread" style="padding:3px 0;border-bottom:1px solid var(--line)"><span><span class="muted num">${i+1}</span> ${plink(p)} ${badge(nationOf(p))} ${batChip((a.bat||'G')[0])} <span class="muted" style="font-size:12px">${a.style==='N'?'':STYLE_NAME[a.style]+' r'+a.rating}${keptCount(p)>=5?' · keeper':''}</span></span><button class="btn sm" data-drm="${k}:${p}" aria-label="Remove">×</button></div>`;}).join('')||'<p class="muted">Pick eleven.</p>'}</div>
    ${L.length<11?`<input type="text" data-dq="${k}" placeholder="Search any player…" value="${esc(DREAM['q'+k]||'')}"><div>${dreamSearch(DREAM['q'+k]).filter(p=>!DREAM.a.includes(p)&&!DREAM.b.includes(p)).map(p=>{const a=A(p);
      return`<div class="spread" style="padding:2px 0"><span>${esc(pName(p))} ${badge(nationOf(p))} <span class="muted" style="font-size:12px">${realCaps(p)} caps · ${a.bat||'-'}${a.style==='N'?'':' · '+STYLE_NAME[a.style]+' r'+a.rating}</span></span><button class="btn sm" data-dadd="${k}:${p}">Add</button></div>`;}).join('')}</div>`:''}</div>`;
}
function dreamHTML(){
  const ready=DREAM.a.length===11&&DREAM.b.length===11&&DREAM.ta!==DREAM.tb;
  return`<div class="card stack"><div class="spread"><div><h3 style="margin:0">Dream XIs</h3><div class="sub">Draft from any era: every man plays at his peak - his best bowling rating and best batting colour. Played in the sandbox; your career is safe.</div></div>
    <div class="seg">${['ODI','T20','TEST'].map(f=>`<button data-dfmt="${f}" class="${DREAM.fmt===f?'on':''}">${FMT_NAME[f]}</button>`).join('')}</div></div>
    <div class="row"><button class="btn pri" id="dr-play" ${ready?'':'disabled'}>Play it (you captain ${esc(teamShort(DREAM.ta))})</button><button class="btn" id="dr-sim" ${ready?'':'disabled'}>Sim it</button><button class="btn" id="dr-code" ${ready?'':'disabled'}>Share code</button>
      ${DREAM.ta===DREAM.tb?'<span class="red" style="font-size:12px">Pick two different team names.</span>':''}</div></div>
    <div class="grid g2" style="align-items:start;margin-top:14px">${dreamSideHTML('a')}${dreamSideHTML('b')}</div>`;
}
function dreamWire(){
  const re=()=>{dreamSave();rerender();};
  $$('[data-dfmt]').forEach(b=>b.onclick=()=>{DREAM.fmt=b.dataset.dfmt;re();});
  $$('[data-dt]').forEach(s=>s.onchange=()=>{DREAM[s.dataset.dt==='a'?'ta':'tb']=+s.value;re();});
  $$('[data-dp]').forEach(s=>s.onchange=()=>{if(!s.value)return;const k=s.dataset.dp,other=DREAM[k==='a'?'b':'a'];DREAM[k]=dreamPreset(+s.value).filter(p=>!other.includes(p)).slice(0,11);DREAM[k==='a'?'ta':'tb']=+s.value;re();});
  $$('[data-dclr]').forEach(b=>b.onclick=()=>{DREAM[b.dataset.dclr]=[];re();});
  $$('[data-drm]').forEach(b=>b.onclick=()=>{const[k,p]=b.dataset.drm.split(':');DREAM[k]=DREAM[k].filter(x=>x!==+p);re();});
  $$('[data-dadd]').forEach(b=>b.onclick=()=>{const[k,p]=b.dataset.dadd.split(':');if(DREAM[k].length<11)DREAM[k].push(+p);DREAM['q'+k]='';re();});
  $$('[data-dq]').forEach(i=>{i.oninput=()=>{DREAM['q'+i.dataset.dq]=i.value;clearTimeout(i._t);i._t=setTimeout(()=>{dreamSave();rerender();const n=$(`[data-dq="${i.dataset.dq}"]`);if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}},250);};});
  $('#dr-play')&&($('#dr-play').onclick=()=>startChallenge(dreamDef()));
  $('#dr-sim')&&($('#dr-sim').onclick=()=>{startChallenge(dreamDef());doToss(LM);simMatch(LM);});
  $('#dr-code')&&($('#dr-code').onclick=()=>showCode(dreamDef()));
}
