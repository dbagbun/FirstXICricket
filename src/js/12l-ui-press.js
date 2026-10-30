// ═══ PRESS ROOM & BACK PAGES ═══
function moodBars(C){
  moraleOf(C);
  const bar=(v,col)=>`<div class="bar" style="height:8px"><i style="width:${v}%;background:${col}"></i></div>`;
  return`<div class="grid g2" style="gap:10px"><div><div class="spread"><span class="sub">Dressing room</span><b class="num">${Math.round(C.morale)}</b></div>${bar(C.morale,C.morale>=75?'var(--green)':C.morale<=25?'var(--red)':'var(--cyan)')}
      <div class="muted" style="font-size:11px">${C.morale>=75?'Buzzing: a top-order batter plays a form step up.':C.morale<=25?'Unhappy: a top-order batter plays a form step down.':'Settled.'}</div></div>
    <div><div class="spread"><span class="sub">Media pressure</span><b class="num">${Math.round(C.heat)}</b></div>${bar(C.heat,C.heat>=70?'var(--red)':C.heat>=45?'var(--gold)':'var(--green)')}
      <div class="muted" style="font-size:11px">${C.heat>=70?'Intense: every defeat costs extra board confidence.':'Manageable.'}</div></div></div>`;
}
function pressRoomHTML(){
  const C=S.coach;if(!C||!C.team)return'';
  const P=C.pc,open=P&&P.qs.some(q=>q.a==null);
  const qs=P?P.qs.map((q,i)=>`<div class="stack" style="gap:6px;margin-top:10px"><div><b>🎙️ ${esc(q.t)}</b></div>
    ${q.a==null?`<div class="row">${q.o.map((o,j)=>`<button class="btn sm" data-pq="${i}:${j}">${esc(o[0])}</button>`).join('')}</div>`
      :`<div class="muted">“${esc(q.o[q.a][0])}”</div>`}</div>`).join(''):'';
  return`<div class="card ${open?'hi':''}"><div class="spread"><h3 style="margin:0">Press room</h3>${open?'<span class="pill live">waiting</span>':''}</div>
    ${P&&P.qs.length?qs+(open?'<div class="muted" style="font-size:12px;margin-top:8px">Questions you leave unanswered lapse at your next match (a little more media pressure).</div>':''):'<p class="muted">No press conference right now - one follows every match.</p>'}
    <div style="margin-top:12px">${moodBars(C)}</div></div>`;
}
function pressWire(){
  $$('[data-pq]').forEach(b=>b.onclick=()=>{const[i,j]=b.dataset.pq.split(':').map(Number);const out=pressAnswer(i,j);(out||[]).forEach(t=>toast(esc(t),'ms'));saveGame();rerender();});
}
const headHTML=(h,big)=>`<div class="paper ${big?'big':''}" data-mid="${h.id}" style="cursor:pointer"><div class="paper-n">${esc(h.paper)} · ${fmtDate(h.date)}</div><div class="paper-h">${esc(h.h)}</div><div class="paper-s">${esc(h.s)}</div></div>`;
function backPagesHTML(n=3){
  const H=S.press?S.press.heads.slice(-n).reverse():[];
  return H.length?`<div class="card"><h3>Back pages</h3><div class="stack" style="gap:8px">${H.map((h,i)=>headHTML(h,i===0)).join('')}</div></div>`:'';
}
