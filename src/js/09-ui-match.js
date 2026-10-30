// ═══ MATCH SCREEN — pre-match, live play, dice, commentary, charts, scorecards ═══
let LM=null;            // the match on screen (S.live)
let WATCH=null;         // watch-mode timer
let MATCH_TAB='card';
const HOW_LABEL={b:'bowled',lbw:'lbw',ct:'caught',ctof:'caught',ctwk:'caught behind',st:'stumped',ro:'run out'};

function dismissalText(how,bowler,fielder){
  if(!how)return'not out';
  const b=pName(bowler),f=fielder?pName(fielder):'';
  switch(how){
    case'b':return'b '+b;
    case'lbw':return'lbw b '+b;
    case'ctwk':return`c †${f} b ${b}`;
    case'st':return`st †${f} b ${b}`;
    case'ro':return`run out (${f})`;
    default:return fielder===bowler?'c &amp; b '+b:`c ${f} b ${b}`;
  }
}
const ballChip=b=>{
  if(b.w)return'<span class="bi w">W</span>';
  if(b.voided)return'<span class="bi v" title="Wicket card, wrong colour for this batter">•</span>';
  if(b.exType==='wd')return`<span class="bi x">wd</span>`;
  if(b.exType==='nb')return`<span class="bi x">nb</span>`;
  if(b.exType)return`<span class="bi x">${b.ex}${b.exType}</span>`;
  return`<span class="bi ${b.bat===4?'b4':b.bat===6?'b6':''}">${b.bat||'•'}</span>`;
};
function ballText(b){
  const who=`${esc(pName(b.bowler))} to ${esc(pName(b.st))}`;
  let t;
  if(b.w)t=`<span class="w">OUT! ${dismissalText(b.how,b.bowler,b.fielder||0)}</span>`;
  else if(b.voided)t=`<span class="sub">${esc(String(b.tok).split('_')[1]||'')} wicket on the card - ${esc(pName(b.st))} is ${BAT_NAME[b.bcol]||'?'} and survives: dot ball</span>`;
  else if(b.exType==='wd')t='wide';
  else if(b.exType==='nb')t='no-ball';
  else if(b.exType==='lb')t=plural(b.ex,'leg bye');
  else if(b.exType==='b')t=plural(b.ex,'bye');
  else t=b.bat===4?'<b>FOUR</b>':b.bat===6?'<b>SIX</b>':b.bat?plural(b.bat,'run'):'no run';
  const ev=(b.ev||[]).filter(e=>e.t!=='innsEnd'&&e.t!=='w').map(e=>' <span class="ms">'+evText(e)+'</span>').join('');
  return`<div><span class="ov">${b.over-1}.${b.legal||b.n}</span>${who}, ${t}${ev} <span class="muted mono" style="font-size:11px">RR_${b.card} · ${b.roll} · c${b.col}</span></div>`;
}
function evText(e){
  switch(e.t){
    case'50':return`${pName(e.pid)} - fifty off ${e.balls} balls`;
    case'100':return`${pName(e.pid)} - HUNDRED off ${e.balls} balls`;
    case'200':return`${pName(e.pid)} - DOUBLE HUNDRED`;
    case'5w':return`${pName(e.pid)} - five wickets (${e.w}/${e.r})`;
    case'hat':return`${pName(e.pid)} - HAT-TRICK!`;
    case'rain':return`Rain: ${e.lost} overs lost on day ${e.day}`;
    case'rainlo':return`Rain! ${plural(e.lost,'over')} lost - ${e.inn===1?'the match is':'the chase is'} cut to ${e.overs} overs a side`;
    case'dl':return`D/L: revised target ${e.target} from ${e.overs} overs`;
    case'drs':return drsText(e);
    case'followon':return`${teamName(e.team)} enforce the follow-on`;
    case'innsEnd':return`End of innings: ${teamName(e.bat)} ${e.runs}${e.wkts<10?'/'+e.wkts:''} (${e.why})`;
    case'result':return e.text;
  }
  return'';
}

// ---------- captaincy ----------
// You captain the team you follow when it's playing, otherwise both sides.
function captainOf(M){
  const L=league();if(M.league&&L&&M.teams.includes(L.mine))return{[L.mine]:true};
  const my=S.settings.myTeam;
  return M.teams.includes(my)?{[my]:true}:Object.fromEntries(M.teams.map(t=>[t,true]));
}
const ATT=[[-1,'Defend'],[0,'Normal'],[1,'Attack']];
function captainPanel(M){
  const I=curInn(M),C=M.manualCaptain||{};
  if(!C[I.bat]&&!C[I.bowl])return'';
  M.att=M.att||{};
  const seg=(key,lab)=>`<span class="sub">${lab}</span> <div class="seg">${ATT.map(([v,n])=>`<button data-att="${key}" data-v="${v}" class="${(M.att[key]||0)===v?'on':''}">${n}</button>`).join('')}</div>`;
  const rows=[];
  if(C[I.bowl]){
    if(!M.cur){
      const opts=bowlerOptions(M);
      rows.push(`<div class="row"><span class="sub">${esc(teamShort(I.bowl))} - next over:</span><select id="cap-bowl"><option value="">AI picks</option>${opts.map(o=>`<option value="${o.pid}" ${o.ok?'':'disabled'} ${M.nextBowler===o.pid?'selected':''}>${esc(pName(o.pid))} - ${oversTxt(o.W.b)}-${o.W.md||0}-${o.W.r}-${o.W.w} · ${STYLE_NAME[o.style]||''} r${Math.min(o.rating,5)}${o.regular?'':' (part-timer)'}${o.real?' · bowled this over for real':''}${o.why?' · '+o.why:''}</option>`).join('')}</select></div>`);
    }
    rows.push(`<div class="row">${seg('f'+I.bowl,'Field:')}</div>`);
  }
  if(C[I.bat]){
    const left=I.order.slice(I.wkts+2).filter(p=>!I.bt[p]);
    if(left.length)rows.push(`<div class="row"><span class="sub">${esc(teamShort(I.bat))} - next in:</span><select id="cap-next">${left.map(p=>`<option value="${p}">${esc(pName(p))} (${BAT_NAME[batColour(M,p,I.wkts+2,I.bowl)]})</option>`).join('')}</select></div>`);
    rows.push(`<div class="row">${seg(I.bat,'Batting:')}</div>`);
  }
  const head=M.h2h?`<h3 style="margin:0">${esc(M.h2h[I.bowl])} (${esc(teamShort(I.bowl))}) bowls · ${esc(M.h2h[I.bat])} (${esc(teamShort(I.bat))}) bats</h3>`:'<h3 style="margin:0">Captain</h3>';
  return`<div class="stack" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">${head}${rows.join('')}
    <div class="muted" style="font-size:12px">Attack moves every over one card faster (more runs, more wickets), defend one slower. Batting and field settings add up.</div></div>`;
}
function wireCaptain(M){
  $$('[data-att]').forEach(b=>b.onclick=()=>{M.att=M.att||{};M.att[b.dataset.att]=+b.dataset.v;rerender();});
  const sb=$('#cap-bowl');if(sb)sb.onchange=()=>{M.nextBowler=+sb.value||null;};
  const sn=$('#cap-next');if(sn)sn.onchange=()=>{setNextBatter(M,+sn.value);rerender();};
}

// ---------- start a fixture ----------
function startFixture(key,fxObj){
  if(S.live&&S.live.state!=='done'){
    if(S.live.key===key){go('match');return;}
    if(!confirm('A match is in progress. Abandon it and start this one?'))return;
  }
  const fx=fxObj||fixtureByKey(key);if(!fx)return;
  if(S.coach&&S.coach.team)ensureObjectives(fx);
  LM=buildMatch(fx);if(fx.friendly)LM.friendly=true;
  LM.manual=S.settings.dice==='manual';
  if(S.settings.captain==='manual')LM.manualCaptain=captainOf(LM);
  S.live=LM;saveGame();
  go('match');
}
function quickSim(key){
  if(S.live&&S.live.key===key&&S.live.state!=='done')S.live=null;
  const M=simFixture(fixtureByKey(key));
  saveGame();
  return M;
}

RENDER.match=(el)=>{
  LM=S.live&&S.live.state!=='done'?S.live:LM;
  if(!LM){
    const last=S.matches[S.matches.length-1];
    el.innerHTML=`<div class="card empty">No match in progress.<br><br><button class="btn pri" data-go="home">Go to the dashboard</button></div>`
      +(last?`<div class="card" style="margin-top:14px"><h3>Last result</h3>${matchLine(last)}</div>`:'');
    return;
  }
  if(LM.state==='pre')return renderPre(el,LM);
  renderLive(el,LM);
};

// ---------- pre-match ----------
const batChip=c=>`<span class="bchip b${c}" title="Falls to ${c==='B'?'BLUE wickets only':c==='G'?'BLUE or GREEN wickets':'any wicket'}">${c}</span>`;
function xiTable(M,t){
  const x=M.xi[t],mine=t===managedTeam();
  const notes=mine&&M.selNotes&&M.selNotes.length?`<div class="muted" style="font-size:12px;margin-bottom:6px">${M.selNotes.map(n=>`${esc(pName(n.inn))} in for ${esc(pName(n.out))} (${n.why})`).join(' · ')}</div>`:'';
  return notes+`<table>${x.bat.map((p,i)=>{const a=pAttr(p,M.date),f=M.mods&&((M.mods.bat[p]||0)-(M.mods.bowl[p]||0));return`<tr><td class="muted">${i+1}</td><td>${batChip(batColour(M,p,i+1,otherTeam(M,t)))} ${plink(p)}${p===x.cap?' <span class="gold">(c)</span>':''}${p===x.wk?' <span class="cyan">†</span>':''}${f>0?' <span class="green" title="In form">▲</span>':f<0?' <span class="red" title="Out of form or tired">▼</span>':''}${mine?' '+fatigueTag(p,M.date):''}</td>
    <td class="r muted" style="font-size:12px">${a.style==='N'?'':STYLE_NAME[a.style]+' '+'●'.repeat(6-Math.min(a.rating,5))}</td><td class="r"><button class="btn sm" data-swap="${t}:${i}">Swap</button></td></tr>`;}).join('')}</table>`;
}
function renderPre(el,M){
  const fx=fixtureByKey(M.key);
  const reseed=M.reseeded?`<div class="banner" style="margin-bottom:12px">In history this was <b>${esc(teamName(M.reseeded.a))} v ${esc(teamName(M.reseeded.b))}</b>. In your timeline the tables say <b>${esc(teamName(M.teams[0]))} v ${esc(teamName(M.teams[1]))}</b>.</div>`:'';
  const P=M.pitch&&PITCHES[M.pitch];
  el.innerHTML=`<div class="card hi stack">
    <div class="spread"><div><div class="sub">${esc(M.series)}${M.stage?' · <span class="gold">'+esc(M.stage)+'</span>':''}</div>
      <h2 style="margin:4px 0">${tlabel(M.teams[0])} <span class="muted">v</span> ${tlabel(M.teams[1])}</h2>
      <div class="muted">${esc(M.venue)}${M.city&&!M.venue.includes(M.city)?', '+esc(M.city):''} · ${fmtDate(M.date)} · ${M.fmt==='TEST'?'Test match (5 days)':M.maxOv+'-over '+(M.fmt==='T20'?'T20':'ODI')}</div></div>
      <span class="pill ${M.fmt==='TEST'?'test':''}">${M.fmt==='TEST'?'TEST':'ODI'}</span></div>
    ${reseed}
    ${P?`<div class="card"><b>Pitch report:</b> ${P.name}. <span class="sub">${P.desc}</span></div>`:''}
    <div class="grid g2"><div class="card"><h3>${esc(teamName(M.teams[0]))}</h3>${xiTable(M,M.teams[0])}</div><div class="card"><h3>${esc(teamName(M.teams[1]))}</h3>${xiTable(M,M.teams[1])}</div></div>
    <div class="card"><h3>The toss</h3><div class="row">
      <select id="toss-w"><option value="r">Random winner</option>${M.teams.map(t=>`<option value="${t}">${esc(teamName(t))} win it</option>`).join('')}</select>
      <select id="toss-c"><option value="">Captain decides</option><option value="bat">and bat</option><option value="bowl">and bowl</option></select>
      <button class="btn pri" id="toss-go">Toss &amp; start</button>
      <button class="btn" id="pre-sim">Quick sim</button></div>
      <div class="row" style="margin-top:10px"><label class="row" style="gap:6px"><input type="checkbox" id="h2h" ${M.friendly?'checked':''}> Two players (head-to-head)</label>
        <span id="h2h-names" class="row ${M.friendly?'':'hidden'}">${M.teams.map((t,i)=>`<label>${badge(t)} <input type="text" id="h2h-${i}" value="Player ${i+1}" style="width:120px"></label>`).join('')}
        <label class="row" style="gap:6px"><input type="checkbox" id="h2h-dice" checked> roll real dice</label></span></div>
      <div class="muted" style="margin-top:6px;font-size:12px">Dice: ${S.settings.dice==='manual'?'you roll (enter each 1-100 roll)':'automatic'} · Captain: ${M.manualCaptain?(Object.keys(M.manualCaptain).length>1?'you, for both sides':'you, for '+esc(teamName(+Object.keys(M.manualCaptain)[0]))):'AI'} - change in Settings.</div></div>
  </div>`;
  $('#h2h').onchange=e=>$('#h2h-names').classList.toggle('hidden',!e.target.checked);
  $('#toss-go').onclick=()=>{
    if($('#h2h').checked){
      M.h2h=Object.fromEntries(M.teams.map((t,i)=>[t,($('#h2h-'+i).value||'Player '+(i+1)).trim()]));
      M.manualCaptain=Object.fromEntries(M.teams.map(t=>[t,true]));M.manual=$('#h2h-dice').checked;
    }
    const w=$('#toss-w').value;doToss(M,w==='r'?null:+w,$('#toss-c').value||null);
    if(M.h2h)toast(`${esc(M.h2h[curInn(M).bowl])} has the ball, ${esc(M.h2h[curInn(M).bat])} bats.`);
    toast(`${esc(teamName(M.toss.w))} won the toss and chose to ${M.toss.choice}.`);saveGame();rerender();};
  $('#pre-sim').onclick=()=>{doToss(M);M.manual=false;M.manualCaptain=null;simMatch(M);};
  $$('[data-swap]').forEach(b=>b.onclick=()=>{const[t,i]=b.dataset.swap.split(':').map(Number);openSwap(M,t,i);});
}
function openSwap(M,t,i){
  const mine=t===managedTeam();
  const x=M.xi[t],cur=x.bat[i],pool=(mine?squadFor(M.sid,t,M.date):squadAround(t,M.date,500)).filter(p=>!x.bat.includes(p)&&!(mine&&isInjured(p,M.date))).slice(0,30);
  openModal(`<h2>Replace ${esc(pName(cur))}</h2><p class="muted">${mine?'From your squad for this series (fit players only).':`Players who turned out for ${esc(teamName(t))} around this date.`}</p>
    <div class="grid g2">${pool.map(p=>{const a=pAttr(p,M.date);return`<button class="btn" data-rep="${p}" style="text-align:left">${esc(pName(p))} <span class="muted">${a.style==='N'?'':STYLE_NAME[a.style]+' r'+a.rating}</span></button>`;}).join('')||'<p class="muted">No one else available.</p>'}</div>
    <h3 style="margin-top:14px">Batting order</h3><div class="row"><button class="btn sm" id="sw-up">Move up</button><button class="btn sm" id="sw-dn">Move down</button><button class="btn sm" id="sw-wk">Make keeper</button><button class="btn sm" id="sw-cap">Make captain</button></div>`);
  $$('[data-rep]').forEach(b=>b.onclick=()=>{const p=+b.dataset.rep;if(x.wk===cur)x.wk=p;if(x.cap===cur)x.cap=p;x.bat[i]=p;delete M.plans[t];M.mods=matchMods(M);closeModal();rerender();});
  const mv=d=>{const j=i+d;if(j<0||j>10)return;[x.bat[i],x.bat[j]]=[x.bat[j],x.bat[i]];closeModal();rerender();};
  $('#sw-up').onclick=()=>mv(-1);$('#sw-dn').onclick=()=>mv(1);
  $('#sw-wk').onclick=()=>{x.wk=cur;closeModal();rerender();};$('#sw-cap').onclick=()=>{x.cap=cur;closeModal();rerender();};
}

// ---------- live ----------
function statusLine(M,I){
  if(M.fmt!=='TEST'){
    const cut=I.maxOv<M.maxOv?` · <span class="gold">reduced to ${I.maxOv} overs</span>`:'';
    if(I.no===2){const need=I.target-I.runs,left=I.maxOv*6-I.lb;
      return need>0?`<b>${teamName(I.bat)} need ${plural(need,'run')} from ${plural(left,'ball')}</b>${M.dl&&M.dl.target?' (D/L target '+I.target+')':''} · RRR ${f2(need/(left/6))}${cut}`:'';}
    return`Run rate ${f2(I.lb?I.runs/(I.lb/6):0)} · Projected ${I.lb?Math.round(I.runs/(I.lb/6)*I.maxOv):'-'}${cut}`;
  }
  const lead=testTotals(M,I.bat)-testTotals(M,I.bowl);
  const ld=I.no===1?'':lead>0?`${teamName(I.bat)} lead by ${lead}`:lead<0?`${teamName(I.bat)} trail by ${-lead}`:'Scores level';
  const tgt=I.no===4?`<b>${teamName(I.bat)} need ${I.target-I.runs} to win</b> · `:'';
  return`${tgt}Day ${testDay(M)}, session ${testSession(M)} · ${Math.floor(testOversLeft(M))} overs left in the match${ld?' · '+ld:''}`;
}
function renderLive(el,M){
  const I=curInn(M),done=M.state==='done';
  const sc=t=>M.inns.filter(x=>x.bat===t).map(x=>`${x.runs}${x.wkts<10?'/'+x.wkts:''}${x.why==='declared'?'d':''}`).join(' &amp; ');
  const ovs=t=>{const x=[...M.inns].reverse().find(y=>y.bat===t);return x?oversTxt(x.lb)+' ov':'';};
  const A=M.toss.bat,B=otherTeam(M,A);
  const bt=I.bt,st=bt[I.st],ns=bt[I.ns];
  const C=M.cur,bowlerId=C?C.bowler:(I.overs.length?I.overs[I.overs.length-1].bowler:0),W=bowlerId&&I.bw[bowlerId];
  const ovNo=C?C.over:(I.overs.length?I.overs[I.overs.length-1].over:0);
  const thisOver=I.balls.filter(b=>b.over===ovNo).slice(-12);
  const lastOvers=I.balls.slice(-18);
  const P=I.part;
  const pend=M.pending&&M.pending.type==='followon',prev=M.pending&&M.pending.type==='review'&&M.pending;
  el.innerHTML=`<div class="stack">
  <div class="sub">${esc(M.series)}${M.stage?' · <span class="gold">'+esc(M.stage)+'</span>':''} · ${esc(M.venue)}</div>
  ${S.settings.broadcast&&S.settings.broadcast!=='standard'?scorebugHTML(M):`<div class="scorebar">
    <div class="sb-team">${badge(A)}<div><div class="sb-score">${sc(A)||'-'}<small>${ovs(A)}</small></div><div class="sub">${esc(teamName(A))}</div></div></div>
    <div class="sb-mid">${done?`<div class="result-big">${esc(M.result.text)}</div>`:`<b>${ordinal(I.no)} innings</b><br>${statusLine(M,I)}`}
      ${M.fmt==='TEST'&&M.pitch?`<br><span class="muted">${PITCHES[M.pitch].name}${M.lost?' · '+M.lost+' overs lost to rain':''}</span>`:''}</div>
    <div class="sb-team r"><div><div class="sb-score">${sc(B)||'-'}<small>${ovs(B)}</small></div><div class="sub">${esc(teamName(B))}</div></div>${badge(B)}</div>
  </div>`}
  ${done?doneBlock(M):`<div class="grid g2">
    <div class="card"><h3>At the crease</h3>
      ${[I.st,I.ns].filter(p=>bt[p]&&!bt[p].out).map(p=>`<div class="bat-line ${p===I.st?'on':''}"><span class="nm">${plink(p)}</span><b class="num">${bt[p].r}</b><span class="muted num">(${bt[p].b})</span><span class="muted num" style="font-size:12px">${bt[p].f4}×4 ${bt[p].f6}×6</span></div>`).join('')}
      ${P?`<div class="muted" style="margin-top:6px">Partnership ${P.r} (${P.bl})</div>`:''}
      ${W?`<h3 style="margin-top:12px">Bowling</h3><div class="bat-line"><span>${plink(bowlerId)}</span><b class="num">${W.w}-${W.r}</b><span class="muted num">${oversTxt(W.b)} ov</span><span class="muted" style="font-size:12px">${STYLE_NAME[pAttr(bowlerId,M.date).style]||''}</span></div>`:''}
    </div>
    <div class="card"><h3>This over</h3>
      <div class="ticker">${thisOver.length?thisOver.map(ballChip).join(''):'<span class="muted">New over</span>'}</div>
      ${C?diceBlock(M,C):'<div class="muted" style="margin-top:8px">The next over picks a card from the bowler\'s rating and the match situation, then one roll reads all six balls.</div>'}
      <div class="ticker" style="margin-top:10px;opacity:.75">${lastOvers.map(ballChip).join('')}</div>
    </div></div>
  <div class="card"><div class="row" id="controls">
    ${pend?`<b>${esc(teamName(M.pending.team))} lead by ${M.pending.lead}.</b> Enforce the follow-on? <button class="btn pri" id="fo-yes">Enforce</button><button class="btn" id="fo-no">Bat again</button>`:prev?reviewAsk(M,prev):`
    <button class="btn" id="c-ball">Next ball</button><button class="btn pri" id="c-over">Bowl over</button>
    <button class="btn" id="c-5">5 overs</button><button class="btn" id="c-inn">End of innings</button>
    <button class="btn" id="c-watch">${WATCH?'❚❚ Pause':'▶ Watch'}</button><button class="btn" id="c-sim">Sim match</button>
    <button class="btn" id="c-snd" aria-label="${S.settings.sound?'Sound off':'Sound on'}" title="Sound">${S.settings.sound?'🔊':'🔇'}</button>
    ${M.fmt==='TEST'&&I.no<4?`<button class="btn warn" id="c-dec">Declare</button>`:''}`}
    <span id="dice-in"></span></div>${captainPanel(M)}</div>`}
  <div class="card"><div class="seg" style="margin-bottom:10px">${[['card','Scorecard'],['comm','Ball by ball'],['charts','Charts'],['field','Field &amp; shots'],['rr','Run-rate card']].map(([k,n])=>`<button data-tab="${k}" class="${MATCH_TAB===k?'on':''}">${n}</button>`).join('')}</div>
    <div id="mtab"></div></div>
  </div>`;
  drawMatchTab(M);
  $$('[data-tab]').forEach(b=>b.onclick=()=>{MATCH_TAB=b.dataset.tab;$$('[data-tab]').forEach(x=>x.classList.toggle('on',x===b));drawMatchTab(M);});
  if(done){$('#d-next')&&($('#d-next').onclick=()=>{const n=nextFixture();LM=null;if(n)startFixture(n.key);else go('home');});return;}
  if(prev){$('#rv-yes').onclick=()=>{decideReview(M,true);step(M,'ball');};$('#rv-no').onclick=()=>{decideReview(M,false);step(M,'ball');};return;}
  if(pend){$('#fo-yes').onclick=()=>{decideFollowOn(M,true);afterStep(M);};$('#fo-no').onclick=()=>{decideFollowOn(M,false);afterStep(M);};return;}
  $('#c-ball').onclick=()=>step(M,'ball');$('#c-over').onclick=()=>step(M,'over');$('#c-5').onclick=()=>step(M,'5');
  $('#c-inn').onclick=()=>step(M,'inn');$('#c-sim').onclick=()=>step(M,'match');$('#c-watch').onclick=()=>toggleWatch(M);
  $('#c-dec')&&($('#c-dec').onclick=()=>{if(confirm(`Declare ${teamName(I.bat)}'s innings at ${I.runs}/${I.wkts}?`)){declare(M);afterStep(M);}});
  wireCaptain(M);fxDice(M);
  $('#c-snd')&&($('#c-snd').onclick=()=>{S.settings.sound=!S.settings.sound;if(S.settings.sound)SFX.crack(.8);saveGame();rerender();});
  if(M.needRoll)askRoll(M);
}
function reviewAsk(M,P){
  const how=P.how==='lbw'?'lbw':'caught behind',who=M.h2h?`<b>${esc(M.h2h[P.side])}</b>: `:'';
  const q=P.field?`<span class="red"><b>OUT!</b></span> ${esc(pName(P.pid))} is given out ${how}. ${who}Review it?`
    :`Big ${how} appeal from ${esc(pName(P.bowler))} - <b>not out</b>. ${who}Review it?`;
  return`<span>📺 ${q}</span><button class="btn pri" id="rv-yes">Review (${P.left} left)</button><button class="btn" id="rv-no">${P.field?'Walk off':'Accept it'}</button>
    <span class="muted" style="font-size:12px">${P.how==='lbw'?"An lbw review rolls for umpire's call (25 or under: the on-field decision stands).":'Caught behind: the replay always finds the truth.'}</span>`;
}
function diceBlock(M,C){
  const row=WORLD.cards[C.card][(C.roll||1)-1];
  return`<div class="row" style="margin-top:10px"><span class="dice">RR_${C.card} <span class="muted">roll</span> <b id="dice-roll">${C.roll||'?'}</b></span>
    <span class="muted" style="font-size:12px">${esc(pName(C.bowler))} (rating ${Math.min(curInn(M).eng.B[C.bi].rating,5)})</span></div>
    ${C.roll?`<div class="cardgrid" style="margin-top:8px">${row.map((t,i)=>`<span class="${i+1===C.col?'cur':i+1<C.col?'used':''}" title="${esc(t)}">${esc(t.replace(/^W_/,'W ').replace(/_/g,' '))}</span>`).join('')}</div>`:''}`;
}
function doneBlock(M){
  const E=S.matches.find(x=>x.id===M.id);
  const n=nextFixture();
  return`<div class="card hi"><div class="spread"><div><div class="result-big">${esc(M.result.text)}</div>
    ${E&&E.motm?`<div style="margin-top:4px">Man of the Match: <b>${plink(E.motm)}</b></div>`:''}${headOf(M.id)?`<div style="margin-top:10px">${headHTML(headOf(M.id),true)}</div>`:''}
    ${S.coach&&S.coach.pc&&S.coach.pc.mid===M.id&&S.coach.pc.qs.some(q=>q.a==null)?'<div style="margin-top:6px"><button class="btn sm" data-go="coach">🎙️ Face the press</button></div>':''}${M.friendly?'<div class="muted">Friendly - not part of your career.</div>':''}</div>
    <div class="row">${n?`<button class="btn pri" id="d-next">Next: ${esc(teamShort(n.a))} v ${esc(teamShort(n.b))}</button>`:''}<button class="btn" data-go="home">Dashboard</button></div></div></div>`;
}
// Steps: ball / over / 5 overs / innings / match. Stops early for a manual roll or a follow-on decision.
function step(M,kind){
  stopWatch();
  const I0=curInn(M),n0=M.inns.length,ov0=I0.lb;
  let g=0;
  const target=kind==='over'?1:kind==='5'?5:0;
  let overs=0;
  FX.allow=kind==='ball'||kind==='over';M.askRev=FX.allow;
  while(M.state==='live'&&!M.pending&&g++<50000){
    const r=bowlBall(M,M.rollIn);M.rollIn=null;
    if(r&&r.need){if(r.need!=='review')M.needRoll=r.need;break;}
    M.needRoll=null;
    if(kind==='ball'){fxBall(M,r);voiceBall(M,r);break;}
    if(!M.cur&&target){overs++;if(overs>=target)break;}
    if(kind==='inn'&&M.inns.length!==n0)break;
  }
  afterStep(M);
}
function afterStep(M){
  if(M.state==='live'&&M.cur===null&&curInn(M).lb%6===0)saveGame();
  rerender();
}
function askRoll(M){
  const C=M.cur,what=M.needRoll==='comp'?'a fresh roll for the re-bowled ball':M.needRoll==='uc'?"the umpire's call roll (25 or under: the decision stands)":'the roll for this over';
  const who=M.h2h?`<b>${esc(M.h2h[curInn(M).bowl])}</b>, `:'';
  $('#dice-in').innerHTML=`<span class="dice">🎲 ${who}${who?'enter':'Enter'} ${what} (RR_${C?C.card:'?'}): <input type="number" id="roll-v" min="1" max="100" style="width:70px"> <button class="btn sm pri" id="roll-ok">Roll in</button> <button class="btn sm" id="roll-auto">Roll for me</button></span>`;
  const go_=v=>{v=+v;if(!(v>=1&&v<=100)){toast('Rolls are 1 to 100.','warn');return;}M.rollIn=v;M.needRoll=null;step(M,'ball');};
  $('#roll-ok').onclick=()=>go_($('#roll-v').value);
  $('#roll-v').onkeydown=e=>{if(e.key==='Enter')go_(e.target.value);};
  $('#roll-auto').onclick=()=>go_(roll100());
  $('#roll-v').focus();
}
function toggleWatch(M){
  if(WATCH){stopWatch();rerender();return;}
  if(M.manual){toast('Watch mode needs automatic dice (Settings).','warn');return;}
  const tick=()=>{
    if(VIEW!=='match'||M.state!=='live'||M.pending){stopWatch();rerender();return;}
    FX.allow=true;M.askRev=true;const b=bowlBall(M);fxBall(M,b);voiceBall(M,b);rerender();
    WATCH=setTimeout(tick,S.settings.ballDelay);
  };
  WATCH=setTimeout(tick,10);rerender();
}
function stopWatch(){if(WATCH){clearTimeout(WATCH);WATCH=null;}}

function drawMatchTab(M){
  const el=$('#mtab');if(!el)return;
  const E=M.state==='done'?(S.matches.find(x=>x.id===M.id)||archiveMatch(M)):archiveMatch(M);
  if(MATCH_TAB==='card')el.innerHTML=scorecardHTML(E,M);
  else if(MATCH_TAB==='comm'){
    el.innerHTML=`<div class="commentary">${commentaryHTML(M)||'<span class="muted">No balls yet.</span>'}</div>`;
  }else if(MATCH_TAB==='charts')el.innerHTML=chartsHTML(E);
  else if(MATCH_TAB==='field'){el.innerHTML=fieldTabHTML(E,M);wireFieldTab(E,M,el);}
  else el.innerHTML=rrCardHTML(M);
}
function rrCardHTML(M){
  const C=M.cur,code=C?C.card:(curInn(M).overs.slice(-1)[0]||{}).card||'3';
  const grid=WORLD.cards[code];
  return`<div class="row" style="margin-bottom:8px">${[...new Set([...RR_CODES,...(M.fmt==='T20'?['8','9']:[])])].map(c=>`<button class="btn sm ${c===code?'pri':''}" data-rr="${c}">RR_${c}</button>`).join('')}</div>
  <div class="muted" style="font-size:12px;margin-bottom:6px">Rows are the 1-100 roll, columns balls 1-6. BLUE wickets get anyone out, GREEN only Nos.7-11, RED only Nos.10-11.</div>
  <div class="tbl-wrap" style="max-height:380px;overflow:auto"><table class="mono" style="font-size:11px" id="rr-tbl">${rrRows(code,C)}</table></div>`;
}
function rrRows(code,C){
  return'<tr><th>Roll</th>'+[1,2,3,4,5,6].map(i=>`<th>B${i}</th>`).join('')+'</tr>'+WORLD.cards[code].map((r,i)=>`<tr ${C&&C.card===code&&C.roll===i+1?'style="background:rgba(6,182,212,.18)"':''}><td class="muted">${i+1}</td>${r.map(t=>`<td style="color:${/BLUE/.test(t)?'#60a5fa':/GREEN/.test(t)?'#4ade80':/RED/.test(t)?'#f87171':t==='4'||t==='6'?'#fde047':''}">${esc(t.replace(/^W_/,'W ').replace(/_/g,' '))}</td>`).join('')}</tr>`).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rr]');if(!b)return;const t=$('#rr-tbl');if(t){t.innerHTML=rrRows(b.dataset.rr,LM&&LM.cur);$$('[data-rr]').forEach(x=>x.classList.toggle('pri',x===b));}});

// ---------- scorecard ----------
function scorecardHTML(E,M){
  return E.inns.map((I,k)=>{
    const ex=I.ex,extras=sum(ex);
    const dnb=E.xi[I.bat].slice(0,11).filter(p=>!I.bt.some(r=>r[0]===p));
    const live=M&&M.state!=='done'&&k===E.inns.length-1;
    const atCrease=live?[M.inns[k].st,M.inns[k].ns]:[];
    return`<div style="margin-bottom:16px"><div class="spread"><h3 style="margin:0">${esc(teamName(I.bat))} - ${E.fmt!=='TEST'?'innings':ordinal(E.inns.filter((x,j)=>j<=k&&x.bat===I.bat).length)+' innings'}</h3>
      <b class="num">${I.runs}${I.wkts<10?'/'+I.wkts:''}${I.why==='declared'?' dec':''} <span class="muted">(${oversTxt(I.lb)} ov${I.target?', target '+I.target:''})</span></b></div>
    <div class="tbl-wrap"><table class="num"><tr><th>Batter</th><th class="hide-sm"></th><th class="r">R</th><th class="r">B</th><th class="r">4s</th><th class="r">6s</th><th class="r">SR</th></tr>
    ${I.bt.map(r=>`<tr><td>${plink(r[0])}${r[0]===E.xi[I.bat][12]?' (c)':''}${r[0]===E.xi[I.bat][11]?' †':''}${atCrease.includes(r[0])&&!r[5]?' <span class="cyan">*</span>':''}</td>
      <td class="hide-sm sub" style="font-size:12px">${r[5]?dismissalText(r[5],r[6],r[7]):live&&atCrease.includes(r[0])?'batting':'not out'}</td>
      <td class="r"><b>${r[1]}</b></td><td class="r">${r[2]}</td><td class="r">${r[3]}</td><td class="r">${r[4]}</td><td class="r">${r[2]?f1(100*r[1]/r[2]):'-'}</td></tr>`).join('')}
    <tr><td>Extras</td><td class="hide-sm sub" style="font-size:12px">(b ${ex[0]}, lb ${ex[1]}, w ${ex[2]}, nb ${ex[3]})</td><td class="r">${extras}</td><td colspan="4"></td></tr></table></div>
    ${dnb.length&&!live?`<div class="muted" style="font-size:12px">Did not bat: ${dnb.map(p=>esc(pName(p))).join(', ')}</div>`:''}
    ${I.fow.length?`<div class="muted" style="font-size:12px;margin-top:4px">Fall of wickets: ${I.fow.map(f=>`${f[1]}-${f[0]} (${esc(pName(f[2]))}, ${f[3]})`).join(', ')}</div>`:''}
    <div class="tbl-wrap" style="margin-top:8px"><table class="num"><tr><th>Bowler</th><th class="r">O</th><th class="r">M</th><th class="r">R</th><th class="r">W</th><th class="r">Econ</th><th class="r hide-sm">Wd</th><th class="r hide-sm">Nb</th></tr>
    ${I.bw.map(w=>`<tr><td>${plink(w[0])}</td><td class="r">${oversTxt(w[1])}</td><td class="r">${w[2]}</td><td class="r">${w[3]}</td><td class="r"><b>${w[4]}</b></td><td class="r">${w[1]?f2(w[3]/(w[1]/6)):'-'}</td><td class="r hide-sm">${w[5]}</td><td class="r hide-sm">${w[6]}</td></tr>`).join('')}</table></div>
    ${I.parts.length?`<details style="margin-top:6px"><summary class="muted" style="cursor:pointer">Partnerships</summary><table class="num">${I.parts.map(p=>`<tr><td>${ordinal(p[4])} wkt</td><td>${esc(pName(p[0]))} &amp; ${esc(pName(p[1]))}</td><td class="r"><b>${p[2]}</b>${p[5]?'':'*'}</td><td class="r muted">(${p[3]} balls)</td></tr>`).join('')}</table></details>`:''}
    </div>`;
  }).join('')+(E.inns.length?'':'<div class="muted">No play yet.</div>')+(E.result&&E.motm&&(!M||M.state==='done')?`<div class="banner">Man of the Match: <b>${plink(E.motm)}</b></div>`:'')
  +superOverHTML(E)+(E.dl?`<div class="muted" style="margin-top:6px">Rain: target revised by the D/L method to ${E.dl.target} from ${E.dl.overs} overs.</div>`:'')
  +(E.drs?`<div class="muted" style="margin-top:6px">📺 Reviews: ${esc(drsSummary(E))}</div>`:'')
  +(!M||M.state==='done'?realHTML(E)+realBlock(E):'');   // no spoilers mid-match
}
function superOverHTML(E){
  if(!E.so)return'';
  return`<div class="banner" style="margin-top:10px"><b>Super over</b>${E.so.r.map((rd,k)=>`<div style="margin-top:4px">${E.so.r.length>1?'Round '+(k+1)+': ':''}${rd.map(x=>`${badge(x[0])} ${x[1]}/${x[2]} <span class="muted mono" style="font-size:12px">${esc(x[4])} (${esc(pName(x[3]))})</span>`).join(' &nbsp; ')}</div>`).join('')}
    <div style="margin-top:4px">${esc(teamName(E.so.w))} won${E.so.b?' on boundary count':''}</div></div>`;
}
// "What really happened": the real bowling figures for a historical ODI.
function realBlock(E){
  const f=E.fid&&FIX_BY_NO.get(E.fid);if(!f||E.reseeded)return'';
  const rows=E.teams.map(t=>[t,realFigures(f.cid,t)]).filter(x=>x[1].length);
  if(!rows.length)return'';
  return`<details style="margin-top:12px"><summary class="muted" style="cursor:pointer">Real bowling figures</summary>${rows.map(([t,fig])=>`<h3 style="margin-top:10px">${esc(teamName(t))} bowling</h3><table class="num">${fig.map(r=>`<tr><td>${esc(pName(r[0]))}</td><td class="r">${r[1]} ov</td><td class="r">${r[2]} m</td><td class="r">${r[3]} r</td><td class="r"><b>${r[4]} w</b></td></tr>`).join('')}</table>`).join('')}</details>`;
}

// ---------- charts ----------
function chartsHTML(E){
  if(!E.inns.length||!E.inns[0].ov.length)return'<div class="muted">Charts appear once an over has been bowled.</div>';
  const col=['#06b6d4','#ffd700','#34d394','#f97316'];
  const W=640,H=220,pad=30;
  const maxOv=Math.max(...E.inns.map(I=>I.ov.length),E.fmt!=='TEST'?(E.maxOv||50):10);
  const worm=E.inns.map(I=>{let c=0;return I.ov.map(o=>c+=o[0]);});
  const maxR=Math.max(50,...worm.map(w=>w[w.length-1]||0));
  const x=i=>pad+(W-pad*2)*(i/maxOv),y=v=>H-pad-(H-pad*2)*(v/maxR);
  const ticks=[0,.25,.5,.75,1].map(t=>Math.round(maxR*t));
  const wormSvg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Worm chart">${ticks.map(t=>`<line x1="${pad}" x2="${W-pad}" y1="${y(t)}" y2="${y(t)}" stroke="#1e293b"/><text x="4" y="${y(t)+3}">${t}</text>`).join('')}
    ${worm.map((w,k)=>`<polyline fill="none" stroke="${col[k]}" stroke-width="2" points="${pad},${y(0)} ${w.map((v,i)=>`${x(i+1)},${y(v)}`).join(' ')}"/>`+E.inns[k].ov.map((o,i)=>o[1]?`<circle cx="${x(i+1)}" cy="${y(w[i])}" r="3.5" fill="#ef4444"/>`:'').join('')).join('')}
    <text x="${W/2}" y="${H-6}" text-anchor="middle">overs</text></svg>`;
  const man=E.inns.map((I,k)=>{
    const mx=Math.max(8,...I.ov.map(o=>o[0])),bw=(W-pad*2)/Math.max(I.ov.length,E.fmt!=='TEST'?(E.maxOv||50):20);
    return`<div class="sub" style="margin-top:8px">${esc(teamName(I.bat))} - runs per over</div><svg viewBox="0 0 ${W} 120" role="img" aria-label="Manhattan">${I.ov.map((o,i)=>`<rect x="${pad+i*bw}" y="${100-90*o[0]/mx}" width="${Math.max(1,bw-1)}" height="${90*o[0]/mx}" fill="${col[k]}" opacity=".85"/>${o[1]?`<circle cx="${pad+i*bw+bw/2}" cy="${96-90*o[0]/mx}" r="3" fill="#ef4444"/>`:''}`).join('')}<text x="4" y="14">${mx}</text></svg>`;
  }).join('');
  return`<div class="chart"><div class="row" style="font-size:12px">${E.inns.map((I,k)=>`<span><span style="display:inline-block;width:10px;height:10px;background:${col[k]};border-radius:2px"></span> ${esc(teamShort(I.bat))} ${ordinal(k+1)} inns</span>`).join('')}<span class="muted">● wicket</span></div>${wormSvg}${man}</div>`;
}
function openScorecard(mid){
  const E=S.matches.find(x=>x.id===mid);if(!E)return;
  openModal(`<div class="sub">${esc(E.series)}${E.stage?' · '+esc(E.stage):''} · ${esc(E.venue)} · ${fmtDate(E.date)}</div>
    <h2 style="margin:6px 0">${tlabel(E.teams[0])} v ${tlabel(E.teams[1])}</h2><div class="result-big" style="margin-bottom:10px">${esc(E.result.text)}</div>
    <div class="muted" style="margin-bottom:10px">Toss: ${esc(teamName(E.toss[0]))}, chose to ${E.toss[1]}${E.pitch?' · '+PITCHES[E.pitch].name:''}${E.reseeded?' · re-seeded knockout':''}</div>
    <div class="row" style="margin-bottom:10px"><button class="btn sm" id="sc-hl">▶ Highlights</button><button class="btn sm" id="sc-img">Save as image</button></div>
    ${scorecardHTML(E)}<h3 style="margin-top:14px">Charts</h3>${chartsHTML(E)}
    ${S.logs[E.id]?'<h3 style="margin-top:14px">Shots &amp; pitch maps</h3><div id="sc-field"></div>':''}
    <details style="margin-top:12px"><summary class="muted" style="cursor:pointer">Key moments</summary>${highlightsListHTML(E)}</details>`);
  const fe=$('#sc-field');if(fe){FIELD_SEL={inn:-1,bat:0,bowl:0};fe.innerHTML=fieldTabHTML(E,null);wireFieldTab(E,null,fe);}
  $('#sc-hl').onclick=()=>{closeModal();playHighlights(E);};
  $('#sc-img').onclick=()=>downloadCanvas(scorecardImage(E),`first-xi-${E.date}-${teamShort(E.teams[0])}-v-${teamShort(E.teams[1])}.png`);
}
