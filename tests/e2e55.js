// e2e55: career lists. After a match you play, a man in it who moves up the career runs or wickets list - of that
// format, or of all international cricket - within or into the top 20 is named, with his total, the new and the old
// place and who he passed (E.lb, careerMoves / careerMoveText), next to the ranking moves. Quick sims skip it.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(let i=0;i<900;i++)simFixture(nextFixture())`);
ok(G(`S.matches.every(E=>!E.lb)`),'quick sims skip the career lists');
const L=G(`(()=>{const all=[];for(let i=0;i<25;i++){const fx=nextFixture(),M=buildMatch(fx);doToss(M);simMatch(M);const E=S.matches[S.matches.length-1];
  all.push({id:E.id,fmt:E.fmt,lb:E.lb||[],men:E.teams.flatMap(t=>E.xi[t].slice(0,11))});}return all;})()`);
const moves=L.flatMap(m=>m.lb.map(x=>({...x,m})));
ok(moves.length>5,'played matches bring career-list moves ('+moves.length+' in 25)');
ok(moves.every(x=>x.m.men.includes(x.id)),'only men in the match');
ok(moves.every(x=>x.to>=1&&x.to<=20&&(!x.from||x.from>x.to)),'up the list, within or into the top 20');
ok(moves.every(x=>x.f==='ALL'||x.f===x.m.fmt),'that format or all international cricket');
ok(moves.some(x=>x.f==='ALL'),'the all-formats lists too');
// the place is right: count those ahead now
ok(moves.every(x=>G(`(()=>{const v=${x.v},s='${x.s}',fs=${JSON.stringify(x.f==='ALL'?['ODI','TEST','T20']:[x.f])};const t={};
  for(const f of fs)for(const[p,y]of Object.entries(S.stats[f]))if(y[s])t[p]=(t[p]||0)+y[s];return Object.values(t).filter(y=>y>v).length+1;})()`)>=x.to),'the new place matches the stats (ties share)');
const txt=moves.map(x=>G(`careerMoveText(${JSON.stringify(x)})`));
ok(txt.every(t=>/on the career (ODI|Test|T20|international \(all formats\)) (runs|wickets) list with [\d,]+ \(was /.test(t)),'worded with total and old place: '+txt[0]);
const withPass=moves.find(x=>x.passed.length);ok(withPass&&/passing [^(]+ \([\d,]+\)/.test(G(`careerMoveText(${JSON.stringify(withPass)})`)),'names who he passed, with their totals: '+(withPass?G(`careerMoveText(${JSON.stringify(withPass)})`):''));
ok(moves.every(x=>x.passed.every(q=>Array.isArray(q)&&q[1]<=x.v)),'the men passed have no more than him');
const m=L.find(x=>x.lb.length);G(`openScorecard(${JSON.stringify(m.id)})`);ok(/Career lists/.test($('#modal-box').textContent),'on the scorecard');
console.log(fail?`e2e55: ${fail} failing`:'e2e55 ok');process.exit(fail?1:0);
