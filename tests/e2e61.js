// e2e61: the real ODIs of Feb-Oct 2026 (tools/cricsheet_new_odis.py, WORLD.newodi) - after the workbook's fixture list
// ends - with their real XIs, bowling plans, results and scorecards: no ODI gap before the generated future starts.
// Start in 2026 with the years before filled in from real results and play into July: India's ODIs in England come
// with the real XIs (a debutant among them).
const {JSDOM}=require('jsdom'),fs=require('fs');
const {Blob}=require('buffer');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const boot=()=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.DecompressionStream=DecompressionStream;w.Response=Response;w.Blob=Blob;
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const wait=async(w,f,ms=600000)=>{const t=Date.now();while(!w.eval(f)){if(Date.now()-t>ms)return false;await new Promise(r=>setTimeout(r,50));}return true;};
(async()=>{
  let w=boot(),$=s=>w.document.querySelector(s),G=k=>w.eval(k);
  // the data
  const d=G(`(()=>{const N=new Set(WORLD.newodi),F=WORLD.fixtures.filter(r=>N.has(r[0]));
    const gap=FIX.filter(f=>f.date>'2026-01-31'&&f.date<'2026-11-01').length;
    return{n:F.length,first:F.map(r=>r[1]).sort()[0],last:F.map(r=>r[1]).sort().pop(),gap,lastReal:LAST_REAL,
      xi:F.every(r=>WORLD.xi[r[7]]&&Object.values(WORLD.xi[r[7]]).every(x=>x.length===13&&x[11]>=0&&x[12]>=0&&new Set(x.slice(0,11)).size===11)),
      plans:F.filter(r=>WORLD.plans[r[7]]&&Object.values(WORLD.plans[r[7]]).every(p=>!p.avg&&p.fig.length)).length,
      real:F.filter(r=>WORLD.real[r[7]]&&WORLD.real[r[7]].r).length,extra:F.every(r=>WORLD.extra.includes(r[0]))};})()`);
  ok(d.n>=90&&d.first>='2026-02-01','the 2026 ODIs are in ('+d.n+', from '+d.first+' to '+d.last+')');
  ok(d.gap>=90,'no ODI gap between February and October 2026 ('+d.gap+')');
  ok(d.lastReal>=d.last,'the real calendar runs to them ('+d.lastReal+')');
  ok(d.xi,'real XIs with a keeper and a captain');
  ok(d.plans>=d.n-2&&d.real===d.n,'real bowling plans ('+d.plans+') and results ('+d.real+')');
  ok(d.extra,'saves already past them skip them (WORLD.extra)');
  ok(G(`(()=>{const f=ODI_FX.find(x=>x.f.raw==='India tour of England (Match 1)'&&x.date>'2026');return f&&realFigures(f.f.cid,f.a).length>0;})()`),'real figures, not averages');
  // start in 2026, real results before
  if(!G('HIST_GZ')){console.log('e2e61 ok (no hist in this build)');process.exit(fail?1:0);}
  w=boot();$=s=>w.document.querySelector(s);G=k=>w.eval(k);
  $('#sp-year').value='2026';$('#sp-year').dispatchEvent(new w.Event('change'));$('#sp-go').click();
  ok(await wait(w,'S&&S.prefilled>0&&!S.prefill'),'2002-2025 filled in');
  ok(G(`allFixtures().filter(x=>x.fmt==='ODI'&&x.date>'2026-02-01'&&x.playable!==false).length`)>=90,'the 2026 ODIs are to be played');
  G(`for(let i=0;i<4000;i++){const n=nextFixture();if(!n||n.date>'2026-07-20')break;simFixture(n);}`);
  const ind=G(`S.matches.filter(E=>E.fmt==='ODI'&&/India tour of England/.test(E.series)&&E.date>'2026').map(E=>{const f=FIX_BY_NO.get(E.fid),x=WORLD.xi[f.cid];
    return{d:E.date,same:[f.a,f.b].every(t=>[...E.xi[t].slice(0,11)].sort().join()===[...x[t].slice(0,11)].sort().join()),
      brar:E.xi[3].slice(0,11).some(p=>pName(p)==='Gurnoor Brar'),real:!!realOf(E)};})`);
  ok(ind.length===3,'India\'s three ODIs in England played ('+ind.length+')');
  ok(ind.every(x=>x.same),'with the real XIs');
  ok(ind.some(x=>x.brar),'a debutant among them (Gurnoor Brar)');
  ok(ind.every(x=>x.real),'and what really happened to compare');
  console.log(fail?`e2e61: ${fail} failing`:'e2e61 ok');process.exit(fail?1:0);
})();
