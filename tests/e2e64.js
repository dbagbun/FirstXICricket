// e2e64: tail-enders sent up the order in a Test bat as tail-enders. McGrath made 145 at 3 against the World XI in
// 2005: his 2005 Test colour was GREEN from eight Cricsheet innings (tools/format_ratings.py now pulls a short window
// towards the career average, SHRINK), and at 3 the position lift made him BLUE (in a Test the lift now goes by his
// place in the XI, not the slot he was sent in at). Nightwatchmen are the No.9 or 10, not the No.8 all-rounder.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
const mg=+G(`Object.keys(WORLD.players).find(k=>WORLD.players[k][0]==='GD McGrath')`);
ok(G(`pAttr(${mg},'2005-10-14','TEST').bat`)==='R','McGrath is RED in 2005 Tests');
// the World XI Test: McGrath sent in at 3 stays RED; Ponting at 3 is his own colour
const r=G(`(()=>{const fx=REAL_TEST_FX.find(x=>x.f.cid==='221840');const M=buildMatch(fx);const aus=M.teams.find(t=>teamShort(t)==='AUS'),wxi=M.teams.find(t=>t!==aus);
  const pt=+Object.keys(WORLD.players).find(k=>WORLD.players[k][0]==='RT Ponting');
  return{mg:batColour(M,${mg},3,wxi),mgSlot:M.xi[aus].bat.indexOf(${mg})+1,pt:batColour(M,pt,3,wxi)};})()`);
ok(r.mg==='R'&&r.mgSlot>=9,'McGrath (No.'+r.mgSlot+') sent in at 3 bats RED ('+r.mg+')');
ok(r.pt==='B','Ponting at 3 is BLUE');
// a GREEN No.9 sent up keeps GREEN (no lift to BLUE); the same man in an ODI at 3 keeps the ODI rules
const g=G(`(()=>{const fx=REAL_TEST_FX.find(x=>x.date>'2010');const M=buildMatch(fx),t=M.teams[0],o=M.teams[1],x=M.xi[t].bat;
  const p=x.slice(7).find(p=>(pAttr(p,M.date,'TEST').bat||'')[0]==='G');return p?batColour(M,p,3,o):'none';})()`);
ok(g==='G'||g==='none','a GREEN lower-order man sent in at 3 stays GREEN in a Test ('+g+')');
// nightwatchmen: the No.9 or 10, and they average like tail-enders
const nw=G(`(()=>{let r=0,o=0,n=0,bad=0,nine=0;const L=REAL_TEST_FX.filter((x,i)=>i%9===0);for(const fx of L){const M=buildMatch(fx);M.sim=true;doToss(M);simMatch(M);
  for(const e of M.events)if(e.t==='nw'){const I=M.inns.find(I=>I.bat===e.bat&&I.bt[e.pid]);if(!I)continue;const slot=M.xi[e.bat].bat.indexOf(e.pid);if(slot>=8)nine++;if(slot<6)bad++;const b=I.bt[e.pid];n++;r+=b.r;if(b.out)o++;}}
  return{n,bad,nine,avg:r/Math.max(1,o)};})()`);
// (the No.9 or 10 of the order at the time: after an earlier nightwatchman, or in a real order with a man moved, that
// can be the XI's No.8)
ok(nw.n>=15&&nw.nine/nw.n>=.65&&nw.bad===0,'nightwatchmen are lower-order men: '+nw.nine+' of '+nw.n+' the XI\'s No.9-11, none from the top six');
ok(nw.avg<24,'nightwatchmen average '+nw.avg.toFixed(1)+' (real tail-enders sent up: ~14; it was ~31)');
console.log(fail?`e2e64: ${fail} failing`:'e2e64 ok');process.exit(fail?1:0);
