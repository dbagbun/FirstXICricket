// e2e56: both teams' places in that format's rankings, before the match (under the venue) and while it's played
// (above the scoreboard), as they stood when it started (M.rkPre) - "ODI rankings: AUS 1st v IND 4th".
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`for(let i=0;i<120;i++)simFixture(nextFixture())`);
// the next ODI, pre-match
const key=G(`allFixtures().find(x=>x.playable&&!S.done[x.key]&&x.fmt==='ODI').key`);
G(`for(let i=0;i<400;i++){const n=nextFixture();if(n.key===${JSON.stringify(key)})break;simFixture(n);}startFixture(${JSON.stringify(key)})`);
const want=G(`(()=>{const L=teamRanking('ODI').map(r=>r.team);return S.live.teams.map(t=>teamShort(t)+' '+(L.indexOf(t)+1?ordinal(L.indexOf(t)+1):'unranked')).join(' v ');})()`);
ok($('#pre-rk')&&$('#pre-rk').textContent==='ODI rankings: '+want,'pre-match: '+($('#pre-rk')||{}).textContent);
// while it's played
$('#toss-go').click();
ok($('#live-rk')&&$('#live-rk').textContent==='ODI rankings: '+want,'above the scoreboard: '+($('#live-rk')||{}).textContent);
const before=G(`JSON.stringify(S.live.rkPre)`);
G(`simMatch(S.live)`);
ok(G(`JSON.stringify(LM.rkPre)`)===before,'the places as the match started (not after)');
// formats: a T20I says T20 (and its badge too)
const t20=G(`(()=>{const x=REAL_T20_FX[3];const M=buildMatch(x);return matchRankLine(M);})()`);
ok(/^T20 rankings: /.test(t20),'T20: '+t20);
ok(G(`matchRankLine({fmt:'ODI',teams:[1,3],challenge:{}})`)==='','not for challenges');
console.log(fail?`e2e56: ${fail} failing`:'e2e56 ok');process.exit(fail?1:0);
