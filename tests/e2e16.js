// e2e16: commentary, highlights and share images - varied commentary with over summaries, the same phrase for
// the same ball (no randomness), highlights from the live match and the kept ball log, PNG images in Chromium.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),click=s=>$(s).click();
click('#sp-go');w.startFixture(G('nextFixture().key'));click('#toss-go');
for(let i=0;i<6;i++)click('#c-over');
click('[data-tab="comm"]');
const c=$('#mtab').innerHTML;
ok(/End of over 6/.test(c)&&/End of over 1 /.test(c),'end-of-over summaries');
const phrases=new Set([...$('#mtab').querySelectorAll('.commentary > div')].map(d=>d.textContent.replace(/^[\d.]+/,'').split(',').slice(1).join(',').replace(/RR_.*/,'').trim()));
ok(phrases.size>=8,'commentary varies ('+phrases.size+' distinct lines in 6 overs)');
const b=G('curInn(LM).balls[3]');
ok(G(`phrase(curInn(LM).balls[3],'P')`)===G(`phrase(curInn(LM).balls[3],'P')`),'same ball, same phrase');
const r0=G('Math.random()');ok(typeof r0==='number','');
click('#c-sim');
const E=G('S.matches[0]');
const H=G(`highlightsOf(S.matches[0],null)`);
ok(H.some(h=>h.k==='w')&&H.filter(h=>h.k==='w').length===E.inns.reduce((a,I)=>a+I.wkts,0),'highlights include every wicket');
w.closeModal();w.openScorecard(E.id);
ok($('#sc-hl')&&$('#sc-img')&&$('#modal-box').innerHTML.includes('Key moments'),'scorecard has highlights and image buttons');
$('#sc-hl').click();
ok($('#tv')&&$('#tv').textContent.length>3,'highlights play as TV graphics');
// no canvas in jsdom: the image button must fail politely
ok(G(`downloadCanvas(null,'x.png')`)===false,'no canvas: polite message, no crash');
console.log(fail?`e2e16: ${fail} failing`:'e2e16 ok');
setTimeout(()=>process.exit(fail?1:0),50);
