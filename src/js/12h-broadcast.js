// ═══ BROADCAST STYLES — a TV scorebug and graphics package (Settings → Broadcast style) ═══
// Three looks in the spirit of TV cricket eras - no real broadcaster's names or logos:
//   classic  2000s free-to-air: bevelled navy and gold bar, condensed capitals
//   modern   premium sports channel: black glass, slanted panels, neon accent, big numerals
//   event    world-tournament: white panels, team-colour blocks, purple and gold trim
// 'standard' keeps the original scoreboard. The look is CSS on body[data-bc]; scorebugHTML is shared.
const BROADCASTS=[['standard','Standard'],['classic','Classic'],['modern','Modern'],['event','World event']];
function applyBroadcast(){try{document.body.dataset.bc=(S&&S.settings.broadcast)||'standard';}catch(e){}}
const bugName=pid=>pName(pid).replace(/^([A-Z]{1,4} )+/,'');   // "ME Trescothick" -> "Trescothick"
const bugChip=b=>b.w?'<i class="bw">W</i>':b.exType==='wd'?'<i class="bx">wd</i>':b.exType==='nb'?'<i class="bx">nb</i>':b.exType?`<i class="bx">${b.ex}</i>`:`<i class="${b.bat===4?'b4':b.bat===6?'b6':''}">${b.bat||'•'}</i>`;
function scorebugHTML(M){
  const I=curInn(M),done=M.state==='done',col=t=>TEAM_COL[teamShort(t)]||'#334155';
  const prev=M.inns.filter(x=>x!==I).map(x=>`${teamShort(x.bat)} ${x.runs}${x.wkts<10?'-'+x.wkts:''}${x.why==='declared'?'d':''}`).join(' · ');
  const bt=I.bt,on=[I.st,I.ns].filter(p=>bt[p]&&!bt[p].out);
  const C=M.cur,lastOv=C?C.over:(I.overs.length?I.overs[I.overs.length-1].over:0);
  const bowler=C?C.bowler:(I.overs.length?I.overs[I.overs.length-1].bowler:0),W=bowler&&I.bw[bowler];
  const over=I.balls.filter(b=>b.over===lastOv);
  let info;
  if(done)info=esc(M.result.text);
  else if(M.fmt!=='TEST'&&I.no===2){const need=I.target-I.runs,left=I.maxOv*6-I.lb;info=need>0?`Need ${need} from ${left} balls · RRR ${f2(need/(Math.max(1,left)/6))}`:'';}
  else if(M.fmt==='TEST'){const lead=testTotals(M,I.bat)-testTotals(M,I.bowl);info=`Day ${testDay(M)} · Session ${testSession(M)}${I.no>1?` · ${lead>=0?'Lead':'Trail'} by ${Math.abs(lead)}`:''}${I.no===4?` · Target ${I.target}`:''}`;}
  else info=`Run rate ${f2(I.lb?I.runs/(I.lb/6):0)} · Projected ${I.lb?Math.round(I.runs/(I.lb/6)*I.maxOv):'-'}`;
  return`<div class="bug" style="--ta:${col(I.bat)};--tb:${col(I.bowl)}">
    <div class="bug-head"><span>${esc(M.series||'Friendly')}${M.stage?' · '+esc(M.stage):''}</span><span>${esc(teamShort(I.bat))} v ${esc(teamShort(I.bowl))}</span></div>
    <div class="bug-row">
      <div class="bug-score"><span class="bug-abbr">${esc(teamShort(I.bat))}</span><span class="bug-runs">${I.runs}-${I.wkts}</span><span class="bug-ov">${oversTxt(I.lb)}<small>${M.fmt==='TEST'?'ov':'/'+I.maxOv}</small></span></div>
      <div class="bug-bats">${on.map(p=>`<div class="bug-b ${p===I.st?'on':''}"><span>${esc(bugName(p))}</span><b>${bt[p].r}</b><em>${bt[p].b}</em></div>`).join('')||'<div class="bug-b"><span>-</span></div>'}</div>
      <div class="bug-bowl"><span>${bowler?esc(bugName(bowler)):'-'}</span>${W?`<b>${W.w}-${W.r}</b><em>${oversTxt(W.b)}</em>`:''}</div>
      <div class="bug-over">${over.map(bugChip).join('')}</div>
    </div>
    <div class="bug-info"><span>${info}</span><span>${esc(prev)}</span></div>
  </div>`;
}
