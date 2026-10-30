// e2e38: compare & career graphs, the light theme (per device) and keyboard access, replaying a past match.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();G(`for(let i=0;i<60;i++)simFixture(nextFixture())`);
// compare
const [a,b]=G(`Object.entries(S.stats.ODI).sort((x,y)=>y[1].r-x[1].r).slice(0,2).map(e=>+e[0])`);
const ser=JSON.parse(G(`JSON.stringify(careerSeries(${a},'ODI'))`));
ok(ser.length===G(`S.stats.ODI[${a}].m`)&&ser.at(-1).runs===G(`S.stats.ODI[${a}].r`),'his series ends at his career runs ('+ser.at(-1).runs+')');
G(`Q_F.mode='cmp';Q_F.fmt='ODI';Q_F.c1=pName(${a});Q_F.c2=pName(${b})`);w.go('query');
ok(/Batting average/.test($('#view').textContent)&&$$('#view svg').length>=2,'side by side, with graphs');
ok($('#view b.gold'),'the better figures picked out');
w.openPlayer(a);$('#pa-cmp').click();ok(G('VIEW')==='query'&&G('Q_F.c1')===G(`pName(${a})`)&&!G('Q_F.c2'),'graphs from the player card');
// theme
ok(w.document.documentElement.dataset.theme==='dark','dark by default');
w.go('settings');$('[data-thm="light"]').click();
ok(w.document.documentElement.dataset.theme==='light'&&w.localStorage.getItem('fxi_theme')==='light','light theme, remembered on this device');
const store={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);store[k]=w.localStorage.getItem(k);}
const w2=boot(store);ok(w2.document.documentElement.dataset.theme==='light','still light after a reload');
w.document.body.click();ok(w.document.documentElement.dataset.theme==='light','clicking the page does not change it');
$('[data-thm="dark"]').click();
// keyboard: player links are focusable and open with Enter
w.go('home');const pl=$('.plink');ok(pl&&pl.getAttribute('tabindex')==='0','player names can take focus');
if(pl){pl.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));ok(!$('#modal').classList.contains('hidden'),'Enter opens the player');w.closeModal();}
// replay
const E=JSON.parse(G('JSON.stringify(S.matches.at(-1))')),n0=G('S.matches.length');
G(`openScorecard('${E.id}')`);$('#sc-replay').click();
ok(G('VIEW')==='match'&&G('LM.replayOf')===E.id&&G('LM.friendly'),'a replay starts');
ok(G(`JSON.stringify(LM.xi[${E.teams[0]}].bat)`)===JSON.stringify(E.xi[E.teams[0]].slice(0,11))&&G('LM.venue')===E.venue&&G('LM.date')===E.date,'same XIs, ground and date');
if($('#pre-sim'))$('#pre-sim').click();else{$('#toss-go').click();G('LM.manual=false');$('#c-sim').click();}
setTimeout(()=>{
  ok(/First time round/.test($('#modal-box').textContent),'the result compares with the first time round: '+G('LM.state')+' '+G('JSON.stringify([LM.pending,LM.needRoll,LM.manual,curInn(LM)&&curInn(LM).lb,LM.inns.length,VIEW])')+' '+$('#modal-box').textContent.slice(0,120));
  ok(G('S.matches.length')===n0,'and the career is untouched');
  console.log(fail?`e2e38: ${fail} failing`:'e2e38 ok');
  process.exit(fail?1:0);
},200);
