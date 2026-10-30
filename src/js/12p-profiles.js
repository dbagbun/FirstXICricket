// ═══ PROFILES & RECORDS FOR THE NEWER SYSTEMS — shot maps on player cards, review records, the Hall of Fame card ═══
// A player's balls from the kept ball logs (S.logs, the last LOG_KEEP matches): {bat:[balls faced], bowl:[balls bowled]}.
function playerBalls(pid){
  const out={bat:[],bowl:[],n:0};
  for(const E of S.matches){
    if(!S.logs[E.id]||!E.teams.some(t=>E.xi[t].slice(0,11).includes(pid)))continue;out.n++;
    E.inns.forEach((I,k)=>{const B=inningsBalls(E,null,k)||[];for(const b of B){if(b.st===pid)out.bat.push(b);if(b.bowler===pid)out.bowl.push(b);}});
  }
  return out;
}
function playerShotsHTML(pid){
  const P=playerBalls(pid);if(!P.bat.some(b=>b.bat>0)&&P.bowl.length<12)return'';
  const date=careerDate();
  return`<details style="margin-top:10px"><summary class="muted" style="cursor:pointer">Shots &amp; pitch map (his last ${plural(P.n,'match','matches')} with a ball log)</summary>
    <div class="grid g2" style="align-items:start;margin-top:8px">${P.bat.some(b=>b.bat>0)?`<div><h3>Where he scores</h3>${wagonHTML(P.bat,null,date)}</div>`:''}
    ${P.bowl.length>=12?`<div><h3>Where he lands it</h3>${pitchMapHTML(P.bowl,date)}</div>`:''}</div></details>`;
}
// ---------- reviews & umpires, from the archived E.drs: [inn, side, batter, how, code, out] ----------
function drsRecords(fmt){
  const T={},bat={};
  for(const E of S.matches){if(!E.drs||(fmt&&E.fmt!==fmt))continue;
    for(const[,side,pid,,code]of E.drs){
      if(code==='M'){const b=E.inns.find(I=>I.bt.some(r=>r[0]===pid));const t=b?b.bat:0;if(t){(T[t]=T[t]||{t,rev:0,won:0,uc:0,err:0}).err++;}continue;}
      const r=T[side]=T[side]||{t:side,rev:0,won:0,uc:0,err:0};r.rev++;if(code==='O')r.won++;if(code==='U')r.uc++;
      if(code==='O'){const x=bat[pid]=bat[pid]||{pid,n:0};x.n++;}
    }}
  return{teams:Object.values(T).filter(r=>r.rev>=3).sort((a,b)=>b.won/b.rev-a.won/a.rev),bat:Object.values(bat).sort((a,b)=>b.n-a.n).slice(0,5)};
}
function drsRecordsHTML(fmt){
  const R=drsRecords(fmt);if(!R.teams.length)return'';
  return`<div class="card" style="margin-top:14px"><h3>Reviews</h3><div class="tbl-wrap"><table class="num"><tr><th>Team</th><th class="r">Reviews</th><th class="r">Overturned</th><th class="r">%</th><th class="r hide-sm">Umpire's call</th><th class="r hide-sm">Errors that stood</th></tr>
    ${R.teams.map(r=>`<tr><td>${tlabel(r.t)}</td><td class="r">${r.rev}</td><td class="r">${r.won}</td><td class="r"><b>${Math.round(100*r.won/r.rev)}</b></td><td class="r hide-sm">${r.uc}</td><td class="r hide-sm">${r.err}</td></tr>`).join('')}</table></div>
    ${R.bat.length?`<div class="muted" style="font-size:12px;margin-top:6px">Most often saved (or sent off) by a review: ${R.bat.map(x=>`${esc(pName(x.pid))} ${x.n}`).join(', ')}</div>`:''}</div>`;
}
// ---------- the Hall of Fame on the dashboard ----------
function hofCardHTML(){
  if(!S.hof)return'';
  const ind=Object.entries(S.hof.inducted).sort((a,b)=>b[1].year-a[1].year||b[1].pct-a[1].pct);if(!ind.length)return'';
  const y=ind[0][1].year,cls=ind.filter(([,x])=>x.year===y);
  return`<div class="card"><h3>Hall of Fame</h3><div class="sub" style="margin-bottom:6px">The class of ${y}</div>${cls.map(([p,x])=>`<div>🏛️ ${plink(+p)} <span class="muted">${x.pct}%</span></div>`).join('')}
    <div class="muted" style="font-size:12px;margin-top:6px">${plural(ind.length,'member')} in all.</div><button class="btn sm" style="margin-top:6px" id="hof-go">Legends</button></div>`;
}
