// e2e53: milestones say how many got there first ("100 career wickets - the 1st player to get there"), per format -
// the first 10 at every milestone, never for a maiden century or a first five-for; five-fors every 5th, ten-wicket
// matches in Tests;
// a match you play lists the ranking moves (teams that moved, players into or out of the top 10, a new No.1) with the
// new and the old position, in the result and on the scorecard - only for the two sides and the men playing, unless
// someone else goes to No.1. Quick sims don't work them out.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(let i=0;i<700;i++)simFixture(nextFixture())`);
// milestones in order
const ms=G(`S.ms.filter(m=>m.fmt==='ODI'&&m.cat==='Career Runs'&&m.thr===1000)`);
ok(ms.length>=3,'several 1,000-run ODI careers ('+ms.length+')');
ok(ms.every((m,i)=>m.nth===i+1),'counted in order');
// the first 10 to reach any milestone are told their order (never for a maiden century or a first five-for)
ok(G(`S.ms.filter(m=>m.nth).every(m=>/player to get there/.test(m.text)===(!msIsFirst(m.cat,m.thr)&&m.nth<=10))`),'said for the first 10 at every milestone');
ok(ms.slice(0,10).every(m=>/player to get there/.test(m.text))&&ms.slice(10).every(m=>!/player to get there/.test(m.text)),'1,000 runs: the first ten are told (the 1st player to get there), not the rest');
ok(G(`S.ms.some(m=>m.cat==='Career Wickets'&&m.thr===100&&m.nth===1&&/the 1st player to get there/.test(m.text))||!S.ms.some(m=>m.cat==='Career Wickets'&&m.thr===100)`),'the first to 100 wickets says so');
// five-fors every 5th, ten-wicket matches in Tests
ok(G(`MS_DEFS.find(d=>d.cat==='Five-wicket hauls').thr.join()`)==='1,5,10,15,20,25,30,35,40,45,50,55,60,65,70','five-wicket hauls: the first, then every 5th');
ok(G(`S.ms.some(m=>m.cat==='Ten-wicket matches'&&m.fmt==='TEST'&&m.thr===1&&/the 1st player to get there/.test(m.text))`),'the first ten-wicket match in a Test, numbered');
ok(G(`S.ms.filter(m=>m.cat==='Ten-wicket matches').every(m=>m.fmt==='TEST')`),'ten-wicket matches only in Tests');
ok(G(`(()=>{const m=logMilestone('ODI',1,'Career Runs',5000,null,'5,000 career runs');return m&&m.text;})()`).endsWith('player to get there'),'said for 5,000 runs');
ok(G(`S.ms.filter(m=>m.thr===1&&(m.cat==='Centuries'||m.cat==='Five-wicket hauls')).every(m=>!/player to get there/.test(m.text))`),'not for a maiden century or a first five-for');
ok(G(`S.ms.filter(m=>m.fmt==='TEST'&&m.cat==='Career Runs'&&m.thr===1000)[0]?.nth`)===1,'counted per format');
ok(G(`S.ms.filter(m=>m.cat==='Hat-trick').every(m=>!m.nth)`),'one-off moments are not numbered');
ok(JSON.stringify(G(`(()=>{const a=JSON.stringify(S.msN);delete S.msN;return JSON.stringify(msCount())===a;})()`))==='true','the counts rebuild from the milestones (older saves)');
// an older save: the first ten get the order added (once); new milestones already passed are marked, not logged late
ok(G(`(()=>{const L=S.ms.filter(m=>m.cat==='Career Runs'&&m.thr===1000&&m.nth<=10);for(const m of L)m.text=m.text.replace(/ - the .*$/,'');
  const old=S.ms.filter(m=>m.cat==='Ten-wicket matches');S.ms=S.ms.filter(m=>m.cat!=='Ten-wicket matches');for(const k in S.msKeys)if(/Ten-wicket/.test(k))delete S.msKeys[k];delete S.msN;
  delete S.msV;const n0=S.ms.length;msNthFew();msNthFew();
  const ok1=L.length>0&&L.every(m=>(m.text.match(/player to get there/g)||[]).length===1);
  const ok2=S.ms.length===n0&&old.every(m=>S.msKeys['TEST:'+m.pid+':Ten-wicket matches:'+m.thr]);
  const ok3=msCount()['TEST:Ten-wicket matches:1']===old.filter(m=>m.thr===1).length;
  S.ms.push(...old);return ok1&&ok2&&ok3;})()`),'older saves: the order added to the first ten once; ten-wicket matches already reached marked and counted, not logged late');
// a profile: the latest ten, the rest under "All milestones (n)"
{const c={};for(const m of G(`S.ms.map(m=>m.pid)`))c[m]=(c[m]||0)+1;const big=+Object.keys(c).find(k=>c[k]>10);
 if(big){G(`openPlayer(${big})`);const box=$('#modal-box');ok(box.querySelectorAll('details').length>=1&&new RegExp('All milestones \\('+c[big]+'\\)').test(box.textContent),'a profile lists all '+c[big]+' milestones (latest ten, then the rest)');G('closeModal()');}
 else ok(true,'no player with more than ten milestones yet');}
ok(G(`S.matches.every(E=>!E.rk)`),'quick sims skip the ranking moves');
// a match you play
const r=G(`(()=>{const fx=nextFixture();const M=buildMatch(fx);doToss(M);simMatch(M);const E=S.matches[S.matches.length-1];return{rk:E.rk||[],fmt:E.fmt,id:E.id,teams:E.teams,men:E.teams.flatMap(t=>E.xi[t].slice(0,11))};})()`);
let found=r.rk.length?r:null;
const all=[r];
for(let i=0;i<30;i++){const x=G(`(()=>{const fx=nextFixture();const M=buildMatch(fx);doToss(M);simMatch(M);const E=S.matches[S.matches.length-1];return{rk:E.rk||[],fmt:E.fmt,id:E.id,teams:E.teams,men:E.teams.flatMap(t=>E.xi[t].slice(0,11))};})()`);all.push(x);if(x.rk.length&&!found)found=x;}
ok(all.every(m=>m.rk.every(x=>x.to===1||(x.k==='team'?m.teams.includes(x.id):m.men.includes(x.id)))),'only the sides and men playing, unless someone goes to No.1');
ok(found,'a played match brings ranking moves');
if(found){
  const txt=found.rk.map(x=>G(`rankMoveText(${JSON.stringify(x)},'${found.fmt}')`));
  ok(txt.every(t=>/\(was (\d+(st|nd|rd|th)|unranked)\)/.test(t)||/ stay \d+(st|nd|rd|th) in the /.test(t)||/ into the .* team rankings at /.test(t)),'each gives the old position (or stays put): '+txt.slice(0,3).join(' | '));
  ok(found.rk.every(x=>x.k==='team'?true:(x.from<=10)!==(x.to<=10&&x.to>0)||x.to===1),'only moves of note');
  ok(all.every(m=>m.teams.every(t=>m.rk.some(x=>x.k==='team'&&x.id===t))),'both sides every match, moved or not');
  G(`openScorecard(${JSON.stringify(found.id)})`);ok(/Rankings/.test($('#modal-box').textContent),'on the scorecard');G(`closeModal()`);
}
// the words
ok(G(`rankMoveText({k:'bat',id:+Object.keys(WORLD.players)[0],from:14,to:8},'ODI')`).includes('into the top 10 ODI batters at 8th (was 14th)'),'into the top 10');
ok(G(`rankMoveText({k:'bowl',id:+Object.keys(WORLD.players)[0],from:9,to:12},'TEST')`).includes('out of the top 10 Test bowlers: now 12th (was 9th)'),'out of the top 10');
ok(G(`rankMoveText({k:'bat',id:+Object.keys(WORLD.players)[0],from:3,to:1},'ODI')`).includes('new No.1 ODI batter (was 3rd)'),'a new No.1');
ok(G(`rankMoveText({k:'team',id:1,from:4,to:3},'ODI')`).includes('up to 3rd in the ODI team rankings (was 4th)'),'teams');
ok(G(`rankMoveText({k:'team',id:1,from:6,to:6},'ODI')`).includes('stay 6th in the ODI team rankings'),'a team that stays put');
console.log(fail?`e2e53: ${fail} failing`:'e2e53 ok');process.exit(fail?1:0);
