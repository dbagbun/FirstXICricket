// e2e49: start in a later year with the years before filled in from the real scorecards (07q, data/hist.json.gz):
// the real results, scorecards and Players of the Match; the real T20 World Cups and WTC finals in those years
// (and the game's own after); every stat built from them. A normal career never plays the real World Cup matches
// or WTC finals - the game stages its own.
const {JSDOM}=require('jsdom'),fs=require('fs');
const {Blob}=require('buffer');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
// jsdom has no gzip streams: lend it Node's (a browser has its own)
const boot=()=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.DecompressionStream=DecompressionStream;w.Response=Response;w.Blob=Blob;
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const wait=async(w,f,ms=300000)=>{const t=Date.now();while(!w.eval(f)){if(Date.now()-t>ms)return false;await new Promise(r=>setTimeout(r,50));}return true;};
(async()=>{
  let w=boot(),$=s=>w.document.querySelector(s),G=k=>w.eval(k);
  if(!G('HIST_GZ')){console.log('e2e49 skipped (no data/hist.json.gz in this build)');process.exit(0);}
  // a normal career: the game's own T20 World Cups and WTC finals, never the real ones
  $('#sp-go').click();
  ok(G(`allFixtures().every(x=>!(x.f&&x.f.wc)&&!x.wtcFinal)`),'a normal career has no real World Cup or WTC-final fixtures');
  // start in 2022, real results before
  w=boot();$=s=>w.document.querySelector(s);G=k=>w.eval(k);
  ok($('[name=sp-hist][value=real]').checked,'real results are the default');
  $('#sp-year').value='2022';$('#sp-year').dispatchEvent(new w.Event('change'));
  ok(!$('#sp-hist-row').classList.contains('hidden'),'the choice shows for a later start');
  $('#sp-team').value='1';$('#sp-go').click();
  ok(await wait(w,'S&&S.prefilled>0&&!S.prefill'),'2002-2021 filled in');
  ok(G('S.realN')===G('S.prefilled')&&G('S.prefilled')>3500,'every match before 2022 from the real scorecards ('+G('S.realN')+' of '+G('S.prefilled')+')');
  ok(G('S.realTo')==='2022-01-01'&&G('careerDate()')<'2022-01-01'&&G('nextFixture().date')>='2022-01-01','you take over in 2022');
  ok(G(`S.matches.every(E=>E.real===1)`),'all marked real');
  // the 2007 World Cup final, as it happened
  const wc=G(`S.matches.find(E=>/World Cup 2007/.test(E.series)&&/^final/i.test(E.stage||''))`);
  ok(wc&&wc.result.text==='Australia won by 53 runs (D/L method)','2007 World Cup final: '+(wc&&wc.result.text));
  ok(wc&&G(`pName(${wc.motm})`)==='AC Gilchrist','Gilchrist Player of the Match');
  const gil=wc&&wc.inns[0].bt.find(b=>G(`pName(${b[0]})`)==='AC Gilchrist');
  ok(gil&&gil[1]===149&&gil[2]===104,'Gilchrist 149 off 104');
  ok(wc&&wc.inns[0].ov.length===38&&wc.inns[0].fow.length===4,'over-by-over and fall of wickets');
  // the real T20 World Cups, and no game cup for those years
  const t20=G(`S.matches.filter(E=>E.fmt==='T20'&&/^final$/i.test(E.stage||'')&&/^(ICC World Twenty20|World T20|ICC Men.s T20 World Cup) \\d{4}/.test(E.series)).map(E=>E.series.slice(-4)+':'+teamShort(E.result.winner))`);
  ok(JSON.stringify(t20)===JSON.stringify(['2007:IND','2009:PAK','2010:ENG','2012:WI','2014:SL','2016:WI','2021:AUS']),'T20 World Cup winners '+t20.join(' '));
  ok(G(`S.icc.made[2007]`)==='real'&&G(`S.icc.made[2021]`)==='real'&&/^C/.test(G(`S.icc.made[2022]`)),'the game stages the T20 World Cups from 2022');
  ok(G(`allFixtures().filter(x=>x.f&&x.f.wc&&x.date>='2022-01-01').length`)===0,'no real World Cup matches after you take over');
  // the WTC final of 2021, the real one
  ok(JSON.stringify(G(`S.wtc[2021]&&S.wtc[2021].champ`))===JSON.stringify([G(`[...TEAMS.values()].find(t=>t.short==='NZ').id`)]),'New Zealand won the 2021 WTC final');
  ok(G(`S.matches.filter(E=>isWtcFinal(E)).length`)===1,'one WTC final, not two');
  // stats from the real scorecards
  const st=G(`(()=>{const p=+Object.keys(WORLD.players).find(k=>WORLD.players[k][0]==='V Kohli');return S.stats.ODI[p];})()`);
  ok(st&&st.r>12000&&st.c100>=40,'Kohli\'s real ODI record ('+(st&&st.r)+' runs, '+(st&&st.c100)+' hundreds)');
  const hv=G(`(()=>{const L=S.matches.filter(E=>E.fmt==='ODI'&&realOf(E));return[L.length,L.filter(E=>sameAsHistory(E)===false).length];})()`);
  ok(hv[0]>1500&&hv[1]===0,'every ODI as it happened ('+hv[1]+' of '+hv[0]+' differ)');
  ok(!G(`localStorage.getItem('fxi_ach')`)||!/"first"/.test(G(`localStorage.getItem('fxi_ach')`)),'no achievements for history');
  // scorecard and dashboard
  G(`openScorecard(${JSON.stringify(wc.id)})`);
  ok(/As it really happened/.test($('#modal-box').textContent)&&!$('#sc-hl'),'the scorecard says so, and offers no highlights (no ball log)');
  G(`closeModal();go('home')`);ok(/are the real ones/.test($('#view').textContent),'the dashboard says so');
  // and the career carries on from there
  G(`for(let i=0;i<5;i++)simFixture(nextFixture())`);ok(G(`S.matches.slice(-5).every(E=>!E.real)`),'your own matches are played as normal');
  console.log(fail?`e2e49: ${fail} failing`:'e2e49 ok');process.exit(fail?1:0);
})();
