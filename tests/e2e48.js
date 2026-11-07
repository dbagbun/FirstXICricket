// e2e48: start in a later year - every match before it is played out first (stats, records, rankings, milestones),
// with no achievements; coach and player careers begin when you take over; Stop starts from wherever it got to.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=()=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const wait=async(w,f,ms=240000)=>{const t=Date.now();while(!w.eval(f)){if(Date.now()-t>ms)return false;await new Promise(r=>setTimeout(r,50));}return true;};
(async()=>{
  // a plain career in 2005
  let w=boot(),$=s=>w.document.querySelector(s);
  ok($('#sp-year')&&$('#sp-year').value==='2002','starts at the beginning by default');
  ok([...$('#sp-year').options].map(o=>+o.value).slice(-1)[0]>=2025,'any year to the end of the real calendar');
  $('#sp-year').value='2005';$('#sp-year').dispatchEvent(new w.Event('change'));
  ok(/2002-2004 are played out first/.test($('#sp-year-note').textContent),'the note says what happens: '+$('#sp-year-note').textContent);
  $('#sp-team').value='1';$('#sp-go').click();
  ok(await wait(w,'S&&S.prefilled>0&&!S.prefill'),'2002-2004 played out');
  const r=w.eval(`({n:S.prefilled,last:careerDate(),from:S.startFrom,next:nextFixture().date,odi:Object.keys(S.stats.ODI).length,test:Object.keys(S.stats.TEST).length,
    ms:S.ms.length,rk:teamRanking('ODI').length,view:VIEW,ach:localStorage.getItem('fxi_ach')})`);
  ok(r.n>150&&r.last<'2005-01-01'&&r.next>='2005-01-01','every match before 2005 ('+r.n+'), next up '+r.next);
  ok(r.from==='2005-01-01','taken over on 1 Jan 2005');
  ok(r.odi>150&&r.test>50&&r.ms>20&&r.rk>=8,'stats, milestones and rankings in place');
  ok(r.view==='home'&&/played out/.test($('#view').textContent),'the dashboard says so');
  ok(!r.ach||!/"first"/.test(r.ach),'no achievements for the years played out');
  ok(w.eval(`readSlot(SLOT).prefilled`)===r.n,'saved');
  w.eval(`simFixture(nextFixture())`);ok(/"first"/.test(w.eval(`localStorage.getItem('fxi_ach')`)||''),'your first match counts');
  // coaching from 2004
  w=boot();$=s=>w.document.querySelector(s);
  $('#sp-year').value='2004';$('#sp-team').value='3';$('#sp-coach').checked=true;$('#sp-go').click();
  ok(await wait(w,'S&&S.coach'),'the coaching job begins');
  ok(w.eval(`S.coach.team`)===3&&w.eval(`S.prefilled`)>80&&w.eval(`careerDate()`)<'2004-01-01'&&w.eval(`nextFixture().date`)>='2004-01-01','coach from 2004, after the years before');
  ok(w.eval(`VIEW`)==='coach','straight to the coach screen');
  // a player from 2003
  w=boot();$=s=>w.document.querySelector(s);
  $('#sp-year').value='2003';$('#sp-team').value=[...$('#sp-team').options][2].value;$('#sp-me').checked=true;$('#sp-go').click();
  ok(await wait(w,'S&&S.me',60000),'the player career begins');
  ok(w.eval(`S.me.start`)==='2003-01-01'&&w.eval(`S.prefilled`)>0,'signs on in 2003, not 2002 ('+w.eval('S.me.start')+', '+w.eval('S.prefilled')+' played out)');
  // Stop: start from wherever it got to
  w=boot();$=s=>w.document.querySelector(s);
  $('#sp-year').value='2026';$('#sp-go').click();
  await wait(w,'S&&S.matches.length>40');w.document.querySelector('#pf-stop').click();
  ok(await wait(w,'S&&!S.prefill&&S.prefilled>0'),'Stop ends the playing out');
  ok(w.eval(`S.startFrom===careerDate()&&careerDate()<'2010'`),'and you start from there ('+w.eval('S.startFrom')+')');
  console.log(fail?`e2e48: ${fail} failing`:'e2e48 ok');process.exit(fail?1:0);
})();
