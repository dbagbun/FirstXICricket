// e2e37: Test tactics (new ball for seamers, old ball for spinners, fresh bowlers in the morning, the new ball
// when you captain, the AI's nightwatchman and yours, declaration advice) and the full-tour builder.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();
// the full-tour builder
w.openTestCreator('TOUR');
ok($('#tt-t')&&$('#tt-o')&&$('#tt-2'),'the Full tour form');
$('#ts-a').value='4';$('#ts-b').value='1';$('#tt-t').value='3';$('#tt-o').value='3';$('#tt-2').value='2';$('#ts-d').value='2009-06-01';$('#ts-go').click();
const L=JSON.parse(G(`JSON.stringify(S.tests.slice(-3).map(T=>({fmt:T.fmt,n:T.fix.length,a:T.a,b:T.b,from:T.fix[0].date,to:T.fix.at(-1).date})))`));
ok(L.map(x=>x.fmt+x.n).join()==='TEST3,ODI3,T202'&&L.every(x=>x.a===4&&x.b===1),'three legs, Tests first: '+L.map(x=>x.fmt+' '+x.from).join(', '));
ok(L[1].from>L[0].to&&L[2].from>L[1].to,'each leg after the last');
G(`createTour({a:3,b:9,tests:2,odis:0,t20s:3,start:'2010-01-05',order:'white'})`);
ok(G(`S.tests.at(-2).fmt`)==='T20'&&G(`S.tests.at(-1).fmt`)==='TEST','white-ball first, empty legs skipped');
// tactics: the points
const tp=G(`(()=>{const M=newMatch({fmt:'TEST',a:4,b:1,date:'2009-07-01',xiA:nearestXI(4,'2009-07-01'),xiB:nearestXI(1,'2009-07-01')});doToss(M);M.state='live';
  M.lost=0;M.slow=0;const I=curInn(M);const r={};r.newPace=tacticPts(M,{style:'P'});r.newSpin=tacticPts(M,{style:'S'});
  I.lb=65*6;r.oldSpin=tacticPts(M,{style:'S'});r.oldPace=tacticPts(M,{style:'P'});
  I.lb=91*6;r.morning=tacticPts(M,{style:'M'});return r;})()`);
ok(tp.newPace===2&&tp.newSpin===0,'the new ball helps the seamers: +'+tp.newPace+', spinners +'+tp.newSpin);
ok(tp.oldSpin===1&&tp.oldPace===0,'an old ball helps the spinners');
ok(tp.morning===2,'fresh bowlers in the morning');
// the AI sends nightwatchmen
const nw=G(`(()=>{let n=0;for(let i=0;i<12;i++){const M=buildMatch({fmt:'TEST',custom:true,a:4,b:1,date:'2009-07-0'+(1+i%9),venue:'X',city:'',title:'t',key:'nw'+i});M.sim=true;M.friendly=true;doToss(M);simMatch(M);n+=M.events.filter(e=>e.t==='nw').length;}return n;})()`);
ok(nw>0,'AI nightwatchmen in 12 Tests: '+nw);
// your Test: the new ball waits for you; nightwatchman and declaration advice
G(`S.settings.captain='manual'`);
w.startFixture(G(`allFixtures().find(x=>x.fmt==='TEST'&&!S.done[x.key]).key`));$('#toss-go').click();
G(`LM.manualCaptain=Object.fromEntries(LM.teams.map(t=>[t,true]))`);
G(`(()=>{const I=curInn(LM);for(let i=0;i<81&&LM.state==='live'&&LM.inns.length===1;i++)bowlOver(LM);})()`);
if(G('LM.inns.length')===1){
  ok(G(`newBallAge(LM,curInn(LM))`)>=80,'the ball is old: '+G(`newBallAge(LM,curInn(LM))`)+' overs');
  w.rerender();ok($('#cap-nb'),'the new ball is offered');
  $('#cap-nb').click();ok(G(`newBallAge(LM,curInn(LM))`)<=1,'and taken');
}else ok(true,'innings ended early');
// nightwatchman button near the close
G(`(()=>{const I=curInn(LM);LM.lost=(LM.lost||0)+(86-testClock(LM)%90+90)%90;})()`);w.rerender();
const nwb=$('#cap-nw');
if(nwb){const pid=+nwb.dataset.pid;nwb.click();ok(G(`curInn(LM).order[curInn(LM).wkts+2]`)===pid,'your nightwatchman goes in next');}
else ok(!G(`(()=>{const I=curInn(LM),k=I.wkts+2;return LM.state==='live'&&testDay(LM)<5&&testClock(LM)%90>=84&&I.wkts<8&&k<=6&&!I.bt[I.order[k]]&&[7,8,9].some(i=>I.order[i]!=null&&!I.bt[I.order[i]]&&pAttr(I.order[i],LM.date).style!=='N');})()`),'no nightwatchman needed');
ok(/overs left/.test($('#view').textContent),'declaration advice in the captain panel');
console.log(fail?`e2e37: ${fail} failing`:'e2e37 ok');
process.exit(fail?1:0);
