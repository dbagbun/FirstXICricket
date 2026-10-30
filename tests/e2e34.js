// e2e34: the designed T20 cards - six 100x6 cards in the workbook's token language at their stated rates, the
// T20 ladder and weights, phases, the setting back to the provisional ladder, the Run-rate card tab.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();
ok(G('HAS_T20_DESIGN'),'the designed cards are in the data');
const C=JSON.parse(G(`JSON.stringify(T20_DESIGN.map(c=>{const g=WORLD.cards[c];let runs=0,bad=0,wB=0;for(const r of g)for(const t of r){const p=parseToken(t);if(!/^(\\d|WD|NB|LB\\d|B\\d|W_(BLUE|GREEN|RED)_)/.test(t))bad++;runs+=p.bat+p.ex;if(p.w&&p.color==='BLUE')wB++;}
  return{c,rows:g.length,cols:g.every(r=>r.length===6),rpo:runs/100,bad,wB,maxW:Math.max(...g.map(r=>r.filter(t=>/^W_/.test(t)).length))};}))`));
ok(C.every(x=>x.rows===100&&x.cols&&x.bad===0),'six 100 x 6 cards in the workbook\'s tokens');
const want={T6:6,T7:7,T8:8,T9:9,T10:10.2,T12:12};
ok(C.every(x=>Math.abs(x.rpo-want[x.c])<.05),'each card scores its rate: '+C.map(x=>x.c+' '+x.rpo.toFixed(2)).join(', '));
ok(C.every((x,i)=>i===0||x.wB>=C[i-1].wB),'faster cards carry more BLUE wickets: '+C.map(x=>x.wB).join(','));
ok(C.every(x=>x.maxW<=2),'never more than two wickets in a row (an over)');
// the ladder in play
w.startFixture(G(`(()=>{createSeries({fmt:'T20',a:4,b:1,n:1,start:'2019-06-01'});return allFixtures().find(x=>x.fmt==='T20'&&!S.done[x.key]).key;})()`));
ok(G(`JSON.stringify(cardCodes(LM))`)===JSON.stringify(['T6','T7','T8','T9','T10','T12'])&&G('weightKey(LM)')==='T20D','a T20 deals from the designed ladder');
$('#toss-go').click();$('#c-over').click();
ok(/^T\d+$/.test(G('curInn(LM).overs[0].card')),'an over is dealt from it: RR_'+G('curInn(LM).overs[0].card'));
$('[data-tab="rr"]').click();
ok($$('[data-rr]').map(b=>b.textContent).join()==='RR_T6,RR_T7,RR_T8,RR_T9,RR_T10,RR_T12','the Run-rate card tab shows the T20 cards');
// phases: middle overs a card slower, the last two two faster
ok(G(`situationShift(LM,{no:1,maxOv:20,wkts:0,runs:0},10)`)===-1&&G(`situationShift(LM,{no:1,maxOv:20,wkts:0,runs:0},17)`)===1&&G(`situationShift(LM,{no:1,maxOv:20,wkts:0,runs:0},20)`)===2,'phase shifts');
// an ODI still uses the workbook's cards
ok(G(`JSON.stringify(cardCodes({fmt:'ODI'}))`)===JSON.stringify(['3','4A','4B','5','6','7']),'ODIs untouched');
// back to the provisional ladder
w.go('settings');$('[data-set="t20cards"][data-val="provisional"]').click();
ok(G(`S.settings.t20cards`)==='provisional'&&G(`JSON.stringify(cardCodes({fmt:'T20',t20cards:'provisional'}))`)===JSON.stringify(['4B','5','6','8','9','7']),'the provisional ladder is a setting');
const M2=G(`(()=>{const M=buildMatch({fmt:'T20',custom:true,a:4,b:1,date:'2019-06-10',venue:'X',city:'',title:'t',key:'kp'});return M.t20cards;})()`);
ok(M2==='provisional','new matches follow it');
console.log(fail?`e2e34: ${fail} failing`:'e2e34 ok');
process.exit(fail?1:0);
