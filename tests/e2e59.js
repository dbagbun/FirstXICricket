// e2e59: leaderboards at the end of a match you play and on its scorecard (07b leaderboardsHTML): the team table and
// the top 10 batters / bowlers / all-rounders of the format, the career runs and wickets lists (format + all
// internationals), each with the places moved in this match (men who held their place show '–') and the men in the
// match highlighted. Stored on the match (E.lbd) for the last LB_KEEP played matches; quick sims don't get them.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(let i=0;i<700;i++)simFixture(nextFixture())`);
ok(G(`S.matches.every(E=>!E.lbd)`),'quick sims skip them');
// play the next ODI
const r=G(`(()=>{let fx=nextFixture();while(fx.fmt!=='ODI'){simFixture(fx);fx=nextFixture();}
  const before={team:teamRanking('ODI').map(r=>r.team),bat:playerRanking('ODI','bat',200).map(r=>r.pid)};
  const M=buildMatch(fx);doToss(M);simMatch(M);const E=S.matches.at(-1);
  return{L:E.lbd,before,team:teamRanking('ODI').map(r=>[r.team,r.pts]),bat:playerRanking('ODI','bat',10).map(r=>[r.pid,r.v]),id:E.id,
    men:E.teams.flatMap(t=>E.xi[t].slice(0,11)),teams:E.teams,
    runs:Object.entries(S.stats.ODI).map(([p,s])=>[+p,s.r||0]).sort((a,b)=>b[1]-a[1]).slice(0,10)};})()`);
const L=r.L||{};
ok(L.team&&JSON.stringify(L.team.map(x=>[x[0],x[1]]))===JSON.stringify(r.team),'the team table after the match');
ok(L.team&&L.team.every(x=>x[2]===r.before.team.indexOf(x[0])+1),'with each side\'s place before it');
ok(L.bat&&JSON.stringify(L.bat.map(x=>[x[0],x[1]]))===JSON.stringify(r.bat)&&L.bat.every(x=>x[2]===r.before.bat.indexOf(x[0])+1),'top 10 batters, places before');
ok(L.bowl&&L.bowl.length===10&&L.ar&&L.ar.length>0,'bowlers and all-rounders');
ok(L['c:ODI:r']&&JSON.stringify(L['c:ODI:r'].map(x=>x[1]))===JSON.stringify(r.runs.map(x=>x[1])),'career ODI runs top 10');
ok(L['c:ALL:r']&&L['c:ODI:bw']&&L['c:ALL:bw'],'all internationals and wickets too');
// the result screen
setTimeout(()=>{
  const box=$('#modal-box .lbd');
  ok(box,'leaderboards at the end of the match');
  if(box){
    ok(box.querySelectorAll('[data-lbt]').length===6,'six tabs');
    const vis=()=>[...box.querySelectorAll('[data-lbp]')].filter(p=>!p.hidden);
    ok(vis().length===1&&vis()[0].dataset.lbp==='team','one panel at a time, teams first');
    ok(vis()[0].querySelectorAll('tr.lb-hl').length===2,'both sides highlighted');
    box.querySelector('[data-lbt="r"]').click();
    ok(vis()[0].dataset.lbp==='r'&&vis()[0].querySelectorAll('table').length===2,'career runs: the format and all internationals');
    ok([...box.querySelectorAll('.rk-mv')].some(td=>td.textContent==='–'),'men who held their place show –');
    const hl=[...vis()[0].querySelectorAll('tr.lb-hl')].length,want=L['c:ODI:r'].filter(x=>r.men.includes(x[0])).length+L['c:ALL:r'].filter(x=>r.men.includes(x[0])).length;
    ok(hl===want,'men in the match highlighted ('+hl+')');
  }
  G(`closeModal()`);
  // and on the scorecard
  G(`LB_TAB='team';openScorecard(${JSON.stringify(r.id)})`);
  ok($('#modal-box .lbd [data-lbt]'),'on the scorecard');
  $('#modal-box [data-lbt="bowl"]').click();
  ok([...$('#modal-box .lbd').querySelectorAll('[data-lbp]')].filter(p=>!p.hidden)[0].dataset.lbp==='bowl','tabs work there too');
  G(`closeModal()`);
  // the words for moves
  ok(G(`(()=>{const d=document.createElement('table');d.innerHTML='<tr>'+mvCell(3)+mvCell(-2)+mvCell(0)+mvCell('new')+'</tr>';return[...d.querySelectorAll('td')].map(t=>t.textContent).join();})()`)==='▲3,▼2,–,new','▲▼ cells');
  // kept on the last LB_KEEP played matches
  ok(G(`(()=>{for(let i=0;i<LB_KEEP+5;i++)S.matches.push({lbd:{team:[]}});lbTrim();const n=S.matches.filter(E=>E.lbd).length;S.matches.splice(-LB_KEEP-5);return n;})()`)===G('LB_KEEP'),'trimmed to the last '+G('LB_KEEP'));
  console.log(fail?`e2e59: ${fail} failing`:'e2e59 ok');process.exit(fail?1:0);
},1000);
