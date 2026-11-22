// e2e60: ODIs Cricsheet doesn't have (about 400, found against Wikipedia's season pages), added from
// tools/extra_odis.json by tools/extra_odis.py (WORLD.extra) - e.g. the 2004 Paktel Cup's 5th match (abandoned without a
// ball: each side's most-used XI of the series, average overs) and 6th (played; result and totals from Wikipedia), and
// the 2002 Bangladesh tour of South Africa (none of it in Cricsheet: nearest real XIs, the real captains and named
// players put in). A new career plays them; a career filled in from real results records them as they ended (totals
// when known, else just the result); a save already past them skips them (extraFxCheck).
const {JSDOM}=require('jsdom'),fs=require('fs');
const {Blob}=require('buffer');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=store=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.DecompressionStream=DecompressionStream;w.Response=Response;w.Blob=Blob;
  if(store)for(const k in store)w.localStorage.setItem(k,store[k]);
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
(async()=>{
  let w=boot(),G=k=>w.eval(k),$=s=>w.document.querySelector(s);
  $('#sp-go').click();
  const fx=G(`fixturesOf(ODI_FX.find(x=>x.f.cid==='66382').sid).map(x=>[x.date,x.label,x.a,x.b,x.playable])`);
  ok(fx.length===7&&fx.filter(x=>/^Match/.test(x[1])).length===6,'the Paktel Cup has six league games and a final ('+fx.map(x=>x[1]).join(', ')+')');
  ok(fx.every(x=>x[4]),'all playable');
  ok(G(`EXTRA_FX.length`)>=350&&G(`EXTRA_FX.every(k=>S.xfSeen.includes(k))`),'a new career knows them ('+G(`EXTRA_FX.length`)+')');
  ok(G(`new Set(WORLD.fixtures.map(r=>r[0])).size===WORLD.fixtures.length&&new Set(WORLD.fixtures.map(r=>r[7])).size===WORLD.fixtures.length`),'fixture numbers and match ids unique');
  // a whole series Cricsheet lacks: stand-in XIs from the nearest real matches, with the real captains and named men
  const bt=G(`(()=>{const f=ODI_FX.find(x=>x.f.cid==='64782');const ser=fixturesOf(f.sid);const x=t=>WORLD.xi['64782'][t];
    return{n:ser.length,labels:ser.map(s=>s.label).join(),cap:pName(x(5)[x(5)[12]]),capB:pName(x(11)[x(11)[12]]),
      gibbs:x(5).slice(0,11).some(p=>pName(p)==='HH Gibbs'),jubair:x(11).slice(0,11).some(p=>pName(p)==='Talha Jubair'),
      xi:[5,11].every(t=>new Set(x(t).slice(0,11)).size===11),plans:Object.keys(WORLD.plans['64782']).length,
      real:realText(WORLD.real['64782']),pom:pName(WORLD.real['64782'].pom)};})()`);
  ok(bt.n===3&&/Match 1.*Match 2.*Match 3/.test(bt.labels),'Bangladesh in South Africa 2002: three ODIs ('+bt.labels+')');
  ok(bt.cap==='SM Pollock'&&bt.capB==='Khaled Mashud','the real captains ('+bt.cap+', '+bt.capB+')');
  ok(bt.gibbs&&bt.jubair&&bt.xi&&bt.plans===2,'named players in, eleven different men, two bowling plans');
  ok(bt.real==='South Africa won by 168 runs'&&bt.pom==='HH Gibbs','the real result and man of the match');
  // the abandoned match: most-used XIs of the series, plans from average overs (never two overs running)
  const ab=G(`(()=>{const f=ODI_FX.find(x=>x.f.cid==='66439'),R=WORLD.real['66439'];const M=buildMatch(f);
    const plan=t=>WORLD.plans['66439'][t].map;return{teams:[f.a,f.b].map(teamShort),nr:R.r[1],inn:R.inn.length,
    xi:M.xi[f.a].bat.length+M.xi[f.b].bat.length,ok:[f.a,f.b].every(t=>{const m=plan(t);return m.length===50&&[...m].every((c,i)=>!i||c!==m[i-1]);}),
    real:realFigures('66439',f.a).length};})()`);
  ok(ab.teams.join()==='SL,ZIM'&&ab.nr==='nr'&&ab.inn===0,'match 5: Sri Lanka v Zimbabwe, really abandoned');
  ok(ab.xi===22&&ab.ok,'XIs and 50-over plans, no bowler twice running');
  ok(ab.real===0,'averaged plans are not shown as real figures');
  ok(G(`(()=>{const x=WORLD.xi['66439'][10].slice(0,11);return['T Panyangara','DT Hondo','P Utseya'].every(n=>x.some(p=>pName(p)===n));})()`),'Zimbabwe\'s regulars');
  // the played match: the real result
  ok(G(`realText(WORLD.real['66382'])`)==='Pakistan won by 6 wickets'&&G(`pName(WORLD.real['66382'].pom)`)==='MS Atapattu','match 6: Pakistan won by 6 wickets, Atapattu man of the match');
  // played through: the final comes from six league games
  G(`for(let i=0;i<3000;i++){const n=nextFixture();if(n.date>'2004-10-17')break;simFixture(n);}`);
  ok(G(`S.matches.filter(E=>/Paktel/.test(E.series)).length`)===7,'all seven played');
  // an older save already past them: skipped, never played back in time
  G(`S.xfSeen=[];S.skipFx={};const ks=EXTRA_FX;for(const k of ks)delete S.done[k];S.matches=S.matches.filter(E=>!ks.includes('o'+E.fid));saveGame();`);
  const st={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);st[k]=w.localStorage.getItem(k);}
  w=boot(st);G=k=>w.eval(k);w.eval(`if(document.querySelector('#ti-go'))document.querySelector('#ti-go').click()`);
  ok(G(`(()=>{const now=careerDate();return EXTRA_FX.every(k=>{const f=ODI_FX_BY_KEY.get(k);return !!S.skipFx[k]===(f.date<now);});})()`),'skipped in a save already past them, the later ones still to come');
  ok(G(`nextFixture().date`)>='2004-10-16','the next fixture is not back in time ('+G(`nextFixture().date`)+')');
  const sk=G(`(()=>{const now=careerDate(),L=allFixtures().filter(x=>x.skipped);return{n:L.length,past:L.every(x=>x.date<now&&EXTRA_FX.includes(x.key))};})()`);
  ok(sk.n>=100&&sk.past,'the ones already past shown as unplayable ('+sk.n+')');
  // filled in from real results (2005 start)
  w=boot();G=k=>w.eval(k);$=s=>w.document.querySelector(s);
  if(G('HIST_GZ')){
    $('#sp-year').value='2005';$('#sp-year').dispatchEvent(new w.Event('change'));$('#sp-go').click();
    const t=Date.now();while(!G('S&&S.prefilled>0&&!S.prefill')&&Date.now()-t<300000)await new Promise(r=>setTimeout(r,50));
    const P=G(`S.matches.filter(E=>/Paktel/.test(E.series)).map(E=>({d:E.date,r:E.result.text,real:E.real,ab:E.abandoned,motm:E.motm&&pName(E.motm),toss:E.toss}))`);
    ok(P.length===7&&P.every(x=>x.real===1),'all seven from the real results');
    const m5=P.find(x=>x.d==='2004-10-11'),m6=P.find(x=>x.d==='2004-10-14');
    ok(m5&&m5.r==='No result'&&m5.ab,'match 5 abandoned');
    ok(m6&&/^Pakistan won by 6 wickets/.test(m6.r)&&m6.motm==='MS Atapattu','match 6 as it ended ('+(m6&&m6.r)+')');
    const id=G(`S.matches.find(E=>E.date==='2004-10-11').id`);G(`openScorecard(${JSON.stringify(id)})`);
    ok(/No toss/.test($('#modal-box').textContent),'the abandoned match\'s scorecard opens');G('closeModal()');
    const id6=G(`S.matches.find(E=>E.date==='2004-10-14').id`);G(`openScorecard(${JSON.stringify(id6)})`);
    ok(/293/.test($('#modal-box').textContent)&&/297/.test($('#modal-box').textContent),'match 6 shows the real totals');G('closeModal()');
    const sa=G(`(()=>{const E=S.matches.find(E=>E.id==='h64782');return E&&{r:E.result.text,inn:E.inns.map(I=>I.runs+'/'+I.wkts),motm:pName(E.motm)};})()`);
    ok(sa&&/^South Africa won by 168 runs/.test(sa.r)&&sa.inn.join()==='301/8,133/10'&&sa.motm==='HH Gibbs','Bangladesh in South Africa as it ended ('+JSON.stringify(sa)+')');
    const nw=G(`(()=>{const E=S.matches.find(E=>E.id==='h66338');return E&&{r:E.result.text,n:E.inns.length,ab:E.abandoned};})()`);
    ok(nw&&/^Sri Lanka won by 93 runs/.test(nw.r)&&nw.n===0&&!nw.ab,'a match known only by its result keeps the real result ('+JSON.stringify(nw)+')');
    G(`openScorecard('h66338')`);ok(/Only the result is known/.test($('#modal-box').textContent),'its scorecard opens');G('closeModal()');
    ok(G(`S.matches.filter(E=>E.real&&EXTRA_FX.includes('o'+E.fid)).length`)>=100,'the extra ODIs before 2005 all filled in');
  }
  console.log(fail?`e2e60: ${fail} failing`:'e2e60 ok');process.exit(fail?1:0);
})();
