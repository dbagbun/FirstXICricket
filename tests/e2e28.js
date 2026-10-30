// e2e28: health-check fixes - slot summaries kept beside the saves (menus don't unpack careers), the next-fixture
// cursor (played out of order, new series, cup slots), fixtures by series, slow over rates in Tests.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-name').value='Meta test';$('#sp-go').click();
G(`for(let i=0;i<12;i++)simFixture(nextFixture());saveGame()`);
const meta=JSON.parse(w.localStorage.getItem('fxi_save_1_meta'));
ok(meta&&meta.name==='Meta test'&&meta.n===12&&meta.last===G('careerDate()'),'a slot summary beside the save');
w.go('settings');ok(/Meta test · 12 matches/.test($('#view').textContent),'settings reads it');
// an old save without a summary: worked out once, then kept
const raw=w.localStorage.getItem('fxi_save_1');
const w2=boot({fxi_save_1:raw,fxi_slot:'0'});
ok(w2.eval('slotInfo(0)').n===12&&w2.localStorage.getItem('fxi_save_1_meta'),'old saves get a summary');
// delete a slot: the summary goes too
G(`setSlot(1);S.name='Second';saveGame();setSlot(0)`);
ok(w.localStorage.getItem('fxi_save_2_meta'),'second slot summary');
w.go('settings');$('[data-del="1"]').click();
ok(!w.localStorage.getItem('fxi_save_2')&&!w.localStorage.getItem('fxi_save_2_meta'),'deleting a slot removes both');
// next-fixture cursor
const n0=G('nextFixture().key');
const later=G(`allFixtures().filter(x=>x.playable&&!S.done[x.key])[3].key`);
G(`simFixture(fixtureByKey('${later}'))`);
ok(G('nextFixture().key')===n0,'playing a later fixture first leaves the next one in place');
G(`simFixture(nextFixture())`);
ok(G('nextFixture().key')!==n0&&G(`!S.done[nextFixture().key]`),'and moves on once it is played');
G(`createTestSeries({a:4,b:1,n:1,start:'${G('careerDate()')}'})`);
ok(G(`nextFixture().fmt`)==='TEST'||G(`nextFixture().date<=allFixtures().find(x=>x.fmt==='TEST'&&!S.done[x.key]).date`),'a new series is seen at once');
const sid=G('nextFixture().sid');
ok(G(`JSON.stringify(fixturesOf('${sid}').map(x=>x.key))===JSON.stringify(allFixtures().filter(x=>x.sid==='${sid}').map(x=>x.key))`),'fixtures by series');
// cups: knockout slots resolve as their games are played
G(`createCup({name:'Mini',fmt:'ODI',format:'ko',host:4,start:'${G('careerDate()')}',teams:[1,3,4,5]})`);
const cup=G('S.cups.at(-1).id');
G(`for(let i=0;i<10;i++){const x=fixturesOf('${cup}').find(x=>x.playable&&!S.done[x.key]);if(!x)break;simFixture(x);}`);
ok(G(`fixturesOf('${cup}').every(x=>S.done[x.key])`),'a knockout cup plays through to its final');
// slow over rates
const M=JSON.parse(G(`(()=>{const M=buildMatch({fmt:'TEST',custom:true,a:4,b:1,date:'2005-07-21',venue:'X',city:'',title:'t',key:'kslow'});M.sim=true;M.friendly=true;doToss(M);simMatch(M);return JSON.stringify({slow:M.slow||0,days:M.wxDay||0});})()`));
ok(M.days<2||(M.slow>=3*(M.days-1)&&M.slow<=8*(M.days-1)),'over rates: '+M.slow+' overs short over '+M.days+' days');
console.log(fail?`e2e28: ${fail} failing`:'e2e28 ok');
process.exit(fail?1:0);
