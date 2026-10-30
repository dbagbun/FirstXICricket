// e2e35: be a player - create a young cricketer, domestic games build a selection standing, picked at 70+ and
// put into the XI in his role, intent moves the cards for his overs, international form, development (colour and
// rating with experience), dropped below 35, the My player screen, retirement.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-team').value='4';$('#sp-me').checked=true;$('#sp-me').dispatchEvent(new w.Event('change'));
ok(!$('#sp-me-f').classList.contains('hidden'),'player fields appear');
$('#sp-pname').value='T Tester';$('#sp-role').value='pace';$('#sp-age').value='19';$('#sp-go').click();
ok(G('VIEW')==='me'&&G('S.me&&S.me.status')==='domestic','a domestic hopeful');
const pid=G('S.me.pid');
ok(G(`pName(${pid})`)==='T Tester'&&G(`genP(${pid}).me`),'he is a player in the world');
const a0=JSON.parse(G(`JSON.stringify(pAttr(${pid}))`));
ok(a0.style==='P'&&a0.rating===4&&a0.bat==='R','a young quick: rating 4, bats RED');
ok(/My player/.test($('#nav').textContent)&&/Selection standing/.test($('#view').textContent),'the My player screen');
// domestic games until he's picked (force the standing up for the test)
G(`S.me.rep=69`);
let guard=0;while(G('S.me.status')!=='xi'&&guard++<40){G(`(()=>{const fx=meNext();const M=buildMatch(fx);S.me.rep=Math.max(S.me.rep,69);})()`);G(`S.me.rep=75`);G(`S.me.lastFx=null`);}
G(`(()=>{const fx=meNext();S.me.lastFx=null;buildMatch(fx);})()`);
ok(G('S.me.status')==='xi','picked at 70+');
ok(G('S.me.dom.m')>0,'domestic games played on the way ('+G('S.me.dom.m')+')');
// into the XI in his role
const XI=JSON.parse(G(`(()=>{const fx=meNext();const M=buildMatch(fx);return JSON.stringify({bat:M.xi[4].bat,meIn:M.meIn,plans:!!(M.plans&&M.plans[4])});})()`));
ok(XI.bat.includes(pid)&&XI.meIn&&XI.bat.indexOf(pid)>=6,'in the XI, in the bowlers\' places ('+(XI.bat.indexOf(pid)+1)+')');
ok(XI.bat.length===11&&new Set(XI.bat).size===11,'still eleven different players');
// intent moves his overs
G(`S.me.intent.bowl=1`);
ok(G(`meShift({meIn:true},{bat:1,bowl:4,st:0,ns:0},${pid})`)===1&&G(`meShift({meIn:true},{bat:1,bowl:4,st:0,ns:0},99)`)===0,'bowling intent on his overs only');
// play his team's next match through the UI
G(`(()=>{for(let i=0;i<300;i++){const fx=nextFixture();if(!fx||fx.a===4||fx.b===4)break;simFixture(fx);}})()`);
w.startFixture(G('nextFixture().key'));$('#toss-go').click();
ok(G(`LM.meIn`)&&G(`LM.xi[4].bat.includes(${pid})`),'he is in the live match');
ok(/You: T Tester/.test($('#view').textContent)&&$('[data-int="bat"]'),'the intent panel in the match');
$('#c-sim').click();
ok(G(`S.matches.at(-1).xi[4].slice(0,11).includes(${pid})`),'he played');
ok(G(`capsOf(${pid})`)===1&&G(`S.me.log.some(l=>/International debut/.test(l.text))`)&&G(`JSON.parse(localStorage.getItem(ACH_KEY)).meDebut`),'capped: debut logged');
// development: experience lifts the rating
G(`S.me.xp=160`);ok(G(`pAttr(${pid}).rating`)===2,'rating 2 at 150+ experience');
// dropped when the standing falls
G(`S.me.rep=20;S.me.lastFx=null`);G(`(()=>{const fx=meNext();S.me.lastFx=null;buildMatch(fx);})()`);
ok(G('S.me.status')==='dropped'&&!G(`(()=>{const fx=meNext();return buildMatch(fx).xi[4].bat.includes(${pid});})()`),'dropped when the standing falls, and out of the XI');
// a batter: BLUE once the runs come
G(`S.me.role='top';genP(${pid}).st='N';S.me.dom.r=900;S.me.dom.inn=30;S.me.dom.no=2;S.me.xp=50`);
ok(G(`pAttr(${pid}).bat`)==='B','a batter averaging 30+ with experience bats BLUE');
// retire
w.go('me');$('#me-retire').click();
ok(G('S.me.ret')&&G('S.me.status')==='retired'&&G(`genP(${pid}).ret`),'retired');
w.go('me');ok(/Retired/.test($('#view').textContent)&&!$('#me-retire'),'the screen shows it');
console.log(fail?`e2e35: ${fail} failing`:'e2e35 ok');
process.exit(fail?1:0);
