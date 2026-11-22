// e2e62: Tests and T20Is Cricsheet doesn't have, added by tools/extra_odis.py (fmt Test / T20I; WORLD.textra / iextra,
// numbered after the rest so saves keep their keys): stand-in XIs (captain / keeper -1 = the game picks), the real
// results and innings totals; in the calendar in date order with the real Tests of the series; a save already past
// them skips them; a career filled in from real results records them as they ended (Test innings, declarations and
// follow-ons from the totals alone).
const {JSDOM}=require('jsdom'),fs=require('fs');
const {Blob}=require('buffer');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.DecompressionStream=DecompressionStream;w.Response=Response;w.Blob=Blob;
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const wait=async(w,f,ms=600000)=>{const t=Date.now();while(!w.eval(f)){if(Date.now()-t>ms)return false;await new Promise(r=>setTimeout(r,50));}return true;};
(async()=>{
  let w=boot(),$=s=>w.document.querySelector(s),G=k=>w.eval(k);
  $('#sp-go').click();
  const d=G(`(()=>{const T=new Set(WORLD.textra),I=new Set(WORLD.iextra);
    return{t:WORLD.textra.length,i:WORLD.iextra.length,tKeys:EXTRA_FX.filter(k=>k[0]==='r').length,iKeys:EXTRA_FX.filter(k=>k[0]==='i').length,
      after:WORLD.textra.every(n=>WORLD.tests.filter(r=>!T.has(r[0])).every(r=>r[0]<n))&&WORLD.iextra.every(n=>WORLD.t20s.filter(r=>!I.has(r[0])).every(r=>r[0]<n)),
      uniq:new Set(WORLD.tests.map(r=>r[0])).size===WORLD.tests.length&&new Set(WORLD.t20s.map(r=>r[0])).size===WORLD.t20s.length,
      xi:WORLD.tests.filter(r=>T.has(r[0])).every(r=>Object.values(WORLD.txi[r[7]]).every(x=>x.length===13&&new Set(x.slice(0,11)).size===11)),
      seen:EXTRA_FX.every(k=>S.xfSeen.includes(k))};})()`);
  ok(d.t>=100&&d.i>=60&&d.tKeys===d.t&&d.iKeys===d.i,'added Tests ('+d.t+') and T20Is ('+d.i+')');
  ok(d.after&&d.uniq,'numbered after the rest, numbers unique');
  ok(d.xi&&d.seen,'stand-in XIs; a new career knows them all');
  // a Test series Cricsheet has only part of: in date order, numbered 1st to 5th
  const ash=G(`(()=>{const f=REAL_TEST_FX.find(x=>x.f.cid==='64009'||(x.f.raw==='England tour of Australia'&&x.date<'2003-02-01'));
    return fixturesOf(f.sid).map(x=>x.date+' '+x.label+(EXTRA_FX.includes(x.key)?'*':''));})()`);
  ok(ash.length===5&&ash.map(x=>x.split(' ')[1]).join()==='1st,2nd,3rd,4th,5th'&&ash.filter(x=>/\*$/.test(x)).length===3&&ash.every((x,i)=>!i||x>=ash[i-1]),'the 2002-03 Ashes: five Tests in order, three of them added ('+ash.join(' | ')+')');
  // a whole series Cricsheet lacks: Bangladesh in South Africa 2002
  const ba=G(`(()=>{const f=REAL_TEST_FX.find(x=>x.f.cid==='64007'),X=testXI('64007',f.a,f.date);
    return{n:fixturesOf(f.sid).length,label:f.label,cap:pName(X.cap),wk:pName(X.wk),real:realText(WORLD.real['64007']),pom:pName(WORLD.real['64007'].pom)};})()`);
  ok(ba.n===2&&ba.label==='1st Test','Bangladesh in South Africa 2002: two Tests');
  ok(ba.cap==='MV Boucher'&&ba.wk==='MV Boucher','the real captain (Boucher, standing in)');
  ok(/South Africa won by an innings and 107 runs/.test(ba.real)&&ba.pom==='GC Smith','the real result ('+ba.real+')');
  // played in a career: a Test with a stand-in XI, and a T20I
  ok(G(`(()=>{const f=REAL_TEST_FX.find(x=>x.f.cid==='64007');simFixture(f);return S.matches.some(E=>E.fmt==='TEST'&&E.date===f.date&&E.inns.length>=2);})()`),'the added Test plays');
  ok(G(`(()=>{const f=REAL_T20_FX.find(x=>x.f.cid==='264065');return allFixtures().some(x=>x.key===f.key&&x.playable);})()`),'an added T20I is in the calendar');
  ok(G(`allFixtures().every(x=>!(x.f&&x.f.wc))`),'added T20 World Cup matches stay out of a normal career');
  // a save already past them
  G(`S.xfSeen=S.xfSeen.filter(k=>k[0]==='o');S.skipFx={};S.matches=S.matches.filter(E=>E.fmt!=='TEST');delete S.done[REAL_TEST_FX.find(x=>x.f.cid==='64007').key];
    for(let i=0;i<400;i++){const n=nextFixture();if(n.date>'2003-03-01')break;simFixture(n);}
    for(const k of EXTRA_FX)if(k[0]!=='o')delete S.done[k];S.xfSeen=S.xfSeen.filter(k=>k[0]==='o');saveGame();`);   // as a save from before they were added
  const st={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st[k]=w.localStorage.getItem(k);}
  w=boot(st);G=k=>w.eval(k);w.eval(`if(document.querySelector('#ti-go'))document.querySelector('#ti-go').click()`);
  const sk=G(`(()=>{const now=careerDate(),K=EXTRA_FX.filter(k=>k[0]!=='o');return{now,ok:K.every(k=>{const f=ODI_FX_BY_KEY.get(k);return !!S.skipFx[k]===(f.date<now&&!S.done[k]);}),
    n:K.filter(k=>S.skipFx[k]).length,shown:allFixtures().filter(x=>x.skipped&&x.fmt==='TEST').length};})()`);
  ok(sk.ok&&sk.n>=10&&sk.shown>=10,'a save at '+sk.now+' skips the added Tests/T20Is before then ('+sk.n+'), not the later ones');
  // filled in from real results (2007 start)
  w=boot();G=k=>w.eval(k);$=s=>w.document.querySelector(s);
  if(G('HIST_GZ')){
    $('#sp-year').value='2007';$('#sp-year').dispatchEvent(new w.Event('change'));$('#sp-go').click();
    ok(await wait(w,'S&&S.prefilled>0&&!S.prefill'),'2002-2006 filled in');
    const t=G(`(()=>{const E=S.matches.find(E=>E.id==='h64007');return E&&{r:E.result.text,inn:E.inns.map(I=>I.runs+'/'+I.wkts+(I.why==='declared'?'d':'')),real:E.real,motm:pName(E.motm)};})()`);
    ok(t&&/^South Africa won by an innings and 107 runs/.test(t.r)&&t.inn.join()==='529/4d,170/10,252/10'&&t.motm==='GC Smith','an added Test as it ended ('+JSON.stringify(t)+')');
    const fo=G(`(()=>{const L=S.matches.filter(E=>E.fmt==='TEST'&&EXTRA_FX.includes('r'+REAL_TEST_FX.find(x=>'h'+x.f.cid===E.id)?.f.no));
      return{n:L.length,fo:L.filter(E=>E.followOn).length,dr:L.filter(E=>E.result.type==='draw').length};})()`);
    ok(fo.n>=90&&fo.fo>=3&&fo.dr>=10,'the added Tests before 2007 all filled in ('+fo.n+'; '+fo.fo+' follow-ons, '+fo.dr+' draws)');
    const i=G(`(()=>{const E=S.matches.find(E=>E.id==='h264065');return E&&{r:E.result.text,inn:E.inns.map(I=>I.runs)};})()`);
    ok(i&&/^Bangladesh won by 43 runs/.test(i.r)&&i.inn.join()==='166,123','an added T20I as it ended ('+JSON.stringify(i)+')');
    G(`openScorecard('h64007')`);ok(/Only the total is known/.test($('#modal-box').textContent)&&/529\/4 dec/.test($('#modal-box').textContent),'its scorecard: the totals, the declaration');G('closeModal()');
  }
  console.log(fail?`e2e62: ${fail} failing`:'e2e62 ok');process.exit(fail?1:0);
})();
