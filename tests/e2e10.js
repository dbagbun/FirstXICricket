// e2e10: rain, D/L and super overs - forced rain in each innings revises overs and targets correctly,
// heavy rain abandons a match (no result), a knockout tie goes to a super over; archive and screens carry it.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
ok(Math.abs(G('dlRes(50,0)')-100)<.01&&Math.abs(G('dlRes(50,5)')-49)<.1&&Math.abs(G('dlRes(20,0)')-56.6)<1,'resource table anchors (100 / 49.0 / ~56.6)');
ok(G('dlRes(20,0)>dlRes(20,4)&&dlRes(30,2)>dlRes(20,2)'),'resources fall with wickets and with overs');
const mk=`(()=>{const fx=allFixtures().find(x=>x.fmt==='ODI'&&x.playable);const M=buildMatch(fx);M.noWeather=true;doToss(M);return M;})()`;
// rain in the second innings
const r2=G(`(()=>{const M=${mk};M.rainAt={inn:2,over:25,lost:15};M.rainDone=false;simInnings(M);
  const t1=M.inns[0].runs;simMatch(M);const I=M.inns[1];return{t1,mo:I.maxOv,tgt:I.target,res:M.result.text,dl:M.dl&&M.dl.target,lb:I.lb};})()`);
ok(r2.mo===35,'second-innings rain cuts the chase to 35 overs ('+r2.mo+')');
ok(r2.tgt<r2.t1+1&&r2.tgt>r2.t1*.6,'revised target below the original ('+r2.tgt+' v '+(r2.t1+1)+')');
ok(r2.lb<=35*6,'no more than 35 overs bowled');
ok(/D\/L/.test(r2.res)||/No result/.test(r2.res),'result says D/L: '+r2.res);
// rain in the first innings: both sides get the reduced overs
const r1=G(`(()=>{const M=${mk};M.rainAt={inn:1,over:30,lost:10};M.rainDone=false;simMatch(M);return{a:M.inns[0].maxOv,b:M.inns[1]&&M.inns[1].maxOv,tgt:M.inns[1]&&M.inns[1].target,t1:M.inns[0].runs,res:M.result.text};})()`);
ok(r1.a===40&&r1.b===40,'first-innings rain: 40 overs a side ('+r1.a+'/'+r1.b+')');
ok(r1.tgt>=r1.t1+1,'chasing side that loses no overs needs at least as many ('+r1.tgt+' v '+r1.t1+')');
// heavy rain: abandoned
const nr=G(`(()=>{const M=${mk};M.rainAt={inn:1,over:10,lost:35};M.rainDone=false;simMatch(M);return M.result;})()`);
ok(nr.type==='nr'&&/rain/.test(nr.text),'heavy rain gives no result: '+nr.text);
// super over in a knockout tie
const so=G(`(()=>{const M=${mk};M.stage='Final';simMatch(M);M.state='live';M.result=null;const w=superOver(M);return{w,teams:M.teams,rounds:M.superOver.rounds.length,legal:M.superOver.rounds[0][0].balls.length};})()`);
ok(so.teams.includes(so.w)&&so.rounds>=1,'super over produces a winner');
ok(so.legal>=1&&so.legal<=12,'super over is one over (with extras)');
// a played match with rain shows it in the archive and on the scorecard
G(`(()=>{const fx=nextFixture();const M=buildMatch(fx);M.noWeather=true;doToss(M);M.rainAt={inn:2,over:20,lost:12};M.rainDone=false;LM=M;S.live=M;simMatch(M);})()`);
const E=G('S.matches[S.matches.length-1]');
ok(E.dl&&E.dl.target>0&&E.inns[1].mo===38,'archive keeps the D/L target and the reduced overs');
w.openScorecard(E.id);ok($('#modal-box').innerHTML.includes('D/L'),'scorecard mentions D/L');w.closeModal();
console.log(fail?`e2e10: ${fail} failing`:'e2e10 ok');
process.exit(fail?1:0);
