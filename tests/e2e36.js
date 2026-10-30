// e2e36: Dream XIs - draft from any era (search, a nation's best), every man at his peak in the sandbox,
// play or sim it, a share code, the career untouched.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();G(`for(let i=0;i<5;i++)simFixture(nextFixture())`);
const n0=G('S.matches.length');
w.go('play');$('[data-pt="dream"]').click();
ok(/Dream XIs/.test($('#view').textContent)&&$('#dr-play').disabled,'the Dream XIs tab, not ready yet');
// a nation's best for side A
const sel=$('[data-dp="a"]');sel.value='1';sel.dispatchEvent(new w.Event('change'));
ok(G('DREAM.a.length')===11&&G('DREAM.ta')===1,"Australia's best loaded");
const A=G('DREAM.a');
ok(A.some(p=>G(`keptCount(${p})`)>=5)&&A.filter(p=>G(`peakAttr(${p}).style!=='N'&&peakAttr(${p}).rating<=3`)).length>=4,'with a keeper and four real bowlers');
// search and add for side B
const sb=$('[data-dp="b"]');sb.value='3';sb.dispatchEvent(new w.Event('change'));
const drop=G('DREAM.b[10]');$(`[data-drm="b:${drop}"]`).click();
ok(G('DREAM.b.length')===10,'remove a man');
const q=$('[data-dq="b"]');q.value='Kumble';q.dispatchEvent(new w.Event('input'));G(`DREAM.qb='Kumble';rerender()`);
const add=$('[data-dadd^="b:"]');ok(add,'search finds players');
add.click();ok(G('DREAM.b.length')===11&&!$('#dr-play').disabled,'eleven a side: ready');
// play: the sandbox, peak attributes, you captain side A
$('#dr-play').click();
ok(G('!!S.sandbox&&S.sandbox.def.kind')==='dream'&&G('VIEW')==='match','a dream match in the sandbox');
const p=A[0],peak=G(`JSON.stringify(peakAttr(${p}))`);
ok(G(`JSON.stringify((({style,rating,max,bat})=>({style,rating,max,bat}))(pAttr(${p},LM.date)))`)===peak,'he plays at his peak');
ok(G('LM.manualCaptain[1]')&&G('JSON.stringify(LM.teams)')===JSON.stringify([1,3]),'you captain Australia');
$('#toss-go').click();G('simMatch(LM)');
ok(G('S.sandbox.res')&&/dream XI wins|tied|No result/.test(G('S.sandbox.res.text')),'judged: '+G('S.sandbox.res.text'));
ok(G(`JSON.parse(localStorage.getItem(ACH_KEY)).dream`),'achievement');
G('leaveSandbox()');
ok(G('S.matches.length')===n0&&!G('S.sandbox'),'career untouched');
// a share code round trip
const code=G('challengeCode(dreamDef())'),d=G(`JSON.stringify(parseChallengeCode(${JSON.stringify(code)}))`);
ok(JSON.parse(d).kind==='dream'&&JSON.parse(d).a.length===11,'a share code');
// sim it straight away
w.go('play');$('[data-pt="dream"]').click();$('[data-dfmt="T20"]').click();$('#dr-sim').click();
ok(G('S.sandbox')&&G(`S.matches.at(-1).fmt`)==='T20','sim a T20 dream match');
G('leaveSandbox()');
console.log(fail?`e2e36: ${fail} failing`:'e2e36 ok');
process.exit(fail?1:0);
