// e2e45: the real T20I calendar (tools/cricsheet_tests.py --t20) - bilateral and tri-series T20Is with their real XIs
// (the T20 World Cups stay cups); Settings can switch them off; a save from before they were added picks them up
// from its own date, not back in 2005.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
let w=boot();const $=s=>w.document.querySelector(s);
// the real T20 World Cup matches (f.wc) are only for years filled in from real results (e2e49)
const n=w.eval('REAL_T20_FX.filter(x=>!x.f.wc).length');
if(!n){console.log('e2e45 skipped (no real T20Is in this build)');process.exit(0);}
ok(n>1000,'over a thousand real T20Is ('+n+')');
const WC_RE=/^(ICC (Men.s )?T20 World Cup|ICC World Twenty20|World T20) \d{4}/;
const T=w.eval(`REAL_T20_FX.map(x=>[x.fmt,x.key,x.title,!!x.f.wc])`);
ok(T.every(([f,k])=>f==='T20'&&k[0]==='i'),'T20Is keyed i<no>');
ok(T.filter(x=>x[3]).length>250&&T.filter(x=>x[3]).every(x=>WC_RE.test(x[2])),'the real T20 World Cup matches are flagged');
ok(T.filter(x=>!x[3]).every(x=>!WC_RE.test(x[2])),'and only those');
ok(w.eval(`REAL_T20_FX[0].date`)>='2005-01-01','from 2005');
ok(w.eval(`REAL_T20_FX.every(x=>realXIRow(x.f.cid,x.a)&&realXIRow(x.f.cid,x.b))`),'every one has both real XIs');
$('#sp-go').click();
ok(w.eval(`allFixtures().filter(x=>x.real&&x.fmt==='T20').length`)===n,'all in a new career');
// play up to the first one: the real XI walks out
w.eval(`for(let i=0;i<3000;i++){const fx=nextFixture();if(fx.fmt==='T20'){window.TFX=fx;break;}simFixture(fx);}`);
ok(w.eval('TFX&&TFX.key[0]')==='i'&&w.eval('TFX.date')==='2005-02-17','the first T20I comes up in February 2005');
const M=w.eval('buildMatch(TFX)'),X=w.eval('testXI(TFX.f.cid,TFX.a,TFX.date).bat');
ok(M.fmt==='T20'&&JSON.stringify(M.xi[w.eval('TFX.a')].bat)===JSON.stringify(X),'the real XI plays');
ok(w.eval('fixtureByKey(TFX.key)===TFX'),'fixtureByKey finds it');
w.eval('simFixture(TFX)');const E=w.eval('S.matches[S.matches.length-1]');
ok(E.fmt==='T20'&&/T20I/.test(E.series+' '+E.stage),'played as a T20I: '+E.series+' / '+E.stage);
ok(w.eval(`edition(TFX.sid)`)===null,'not treated as an ODI tournament');
w.eval(`go('fixtures');go('home');go('tour')`);ok(!/Something went wrong/.test($('#view').textContent),'screens draw');
// switched off
w.eval(`go('settings')`);const off=$('[data-set="t20is"][data-val="off"]');ok(off,'Real T20Is setting');off&&off.click();
ok(w.eval(`allFixtures().filter(x=>x.real&&x.fmt==='T20').length`)===0,'Off: none in the calendar');
w.eval(`go('settings')`);$('[data-set="t20is"][data-val="on"]').click();
ok(w.eval(`allFixtures().filter(x=>x.real&&x.fmt==='T20').length`)===n,'On again');
// an old save (no t20iFrom), last match in 2008: T20Is from there on
w.eval(`for(let i=0;i<2000;i++){const fx=nextFixture();if(fx.date>='2008-03-01')break;simFixture(fx);}delete S.t20iFrom;saveGame();`);
const cd=w.eval('careerDate()');
const st={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st[k]=w.localStorage.getItem(k);}
w=boot(st);w.eval(`if(document.querySelector('#ti-go'))document.querySelector('#ti-go').click()`);
ok(w.eval('S.t20iFrom')===cd,'old save: T20Is from its own date ('+cd+')');
ok(w.eval(`nextFixture().date`)>=cd,'nothing to replay from before');
ok(w.eval(`allFixtures().filter(x=>x.real&&x.fmt==='T20').every(x=>x.date>=S.t20iFrom)`),'only later T20Is');
console.log(fail?`e2e45: ${fail} failing`:'e2e45 ok');process.exit(fail?1:0);
