// ═══ YOUR TIMELINE v HISTORY — real results from Cricsheet (optional, tools/cricsheet_odis.py) ═══
// WORLD.real[cid] = {r:[winner, 'runs'|'wkts'|'tie'|'nr', margin, dl], inn:[[team,runs,wkts,balls]], pom, top:[pid,r,b], bb:[pid,w,r]}
// Real results are only shown for fixtures you have played (no spoilers), unless Settings -> History is off.
const HAS_REAL=!!(WORLD.real&&Object.keys(WORLD.real).length);
function realOf(E){
  if(!HAS_REAL||!E||!E.fid||(S&&S.settings.history==='off'))return null;
  const f=FIX_BY_NO.get(E.fid);return f&&WORLD.real[f.cid]||null;
}
function realText(R){
  const[w,t,m,dl]=R.r;
  if(t==='nr')return'No result';
  if(t==='tie')return'Match tied';
  return`${teamName(w)} won by ${plural(m,t==='runs'?'run':'wicket')}${dl?' (D/L)':''}`;
}
// same: the same side won (or both tied); null when history had no result or the teams were re-seeded
function sameAsHistory(E){
  const R=realOf(E);if(!R||E.reseeded||R.r[1]==='nr')return null;
  if(R.r[1]==='tie')return E.result.type==='tie'||E.result.type==='so';   // (a tie settled by a super over is still a tie)
  return E.result.winner===R.r[0];
}
function timelineDrift(){
  let n=0,same=0;const changed=[];
  for(const E of S.matches){const s=sameAsHistory(E);if(s===null)continue;n++;if(s)same++;else changed.push(E);}
  return{n,same,changed};
}
// The real winner of an edition's final, once you have played that final.
function realChampion(sid){
  const E=edition(sid);if(!E||!E.ko.length)return 0;
  const f=E.ko[E.ko.length-1];if(!S.done['o'+f.no])return 0;
  const R=HAS_REAL&&WORLD.real[f.cid];return R&&R.r[0]||0;
}
function realHTML(E){
  const R=realOf(E);if(!R)return'';
  const s=sameAsHistory(E);
  return`<div class="card" style="margin-top:12px"><div class="spread"><h3 style="margin:0">What really happened</h3>${s===null?'':s?'<span class="pill win">same winner as history</span>':'<span class="pill ko">history changed</span>'}</div>
    <div class="result-big" style="font-size:16px;margin:6px 0">${esc(realText(R))}</div>
    ${R.inn.map(i=>`<div class="spread"><span>${badge(i[0])} ${esc(teamName(i[0]))}</span><b class="num">${i[1]}${i[2]<10?'/'+i[2]:''} <span class="muted">(${oversTxt(i[3])})</span></b></div>`).join('')}
    <div class="sub" style="margin-top:6px">${R.top[0]?`Top score: ${plink(R.top[0])} ${R.top[1]} (${R.top[2]})`:''}${R.bb[0]?` · Best bowling: ${plink(R.bb[0])} ${R.bb[1]}/${R.bb[2]}`:''}${R.pom?` · Player of the match: ${plink(R.pom)}`:''}</div></div>`;
}
