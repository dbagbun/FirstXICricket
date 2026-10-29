// e2e20: the future - after the real calendar a year is generated (tours in all formats, ICC events), XIs come
// from the ageing pool, players retire and youngsters arrive, real players age; long careers trim old detail.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
G(`(()=>{let fx;while((fx=nextFixture())&&fx.date<'2028-12-31')simFixture(fx);})()`);
const fut=G(`S.matches.filter(E=>E.date>LAST_REAL)`);
ok(fut.length>250,'two-plus future years played ('+fut.length+')');
const fmts=new Set(fut.map(E=>E.fmt));ok(fmts.size===3,'all three formats in the future');
ok(G(`S.cups.some(c=>/T20 World Cup 2026/.test(c.name))&&S.cups.some(c=>/Cricket World Cup 2027/.test(c.name))`),'ICC events scheduled');
const wc=G(`(()=>{const c=S.cups.find(c=>/Cricket World Cup 2027/.test(c.name));return{done:c.fix.every(f=>S.done[f.key]),champ:cupChampion(c),n:c.teams.length};})()`);
ok(wc.done&&wc.champ&&wc.n===10,'2027 World Cup played to a champion ('+G(`teamName(${wc.champ})`)+')');
ok(fut.every(E=>E.teams.every(t=>new Set(E.xi[t].slice(0,11)).size===11)),'every future XI has 11 different players');
ok(fut.every(E=>E.inns.every(I=>I.runs===I.bt.reduce((a,r)=>a+r[1],0)+I.ex.reduce((a,b)=>a+b,0))),'future scorecards add up');
const g=G(`Object.values(S.gen.players)`);
ok(g.some(x=>!x.real)&&g.some(x=>x.ret),'youngsters arrive and players retire');
ok(G(`Object.values(S.gen.players).filter(x=>!x.real).every(x=>pName(Object.keys(S.gen.players).find(k=>S.gen.players[k]===x))===x.n)`),'generated names resolve');
ok(!G(`(()=>{const real=new Set(Object.values(WORLD.players).map(p=>p[0]));return Object.values(S.gen.players).some(x=>!x.real&&real.has(x.n));})()`),'no generated player copies a real name');
const yp=G(`(()=>{const k=Object.keys(S.gen.players).find(k=>!S.gen.players[k].real&&S.gen.players[k].st!=='N');const g=S.gen.players[k];return{a:pAttr(+k,(g.born+19)+'-06-01').rating,b:pAttr(+k,(g.born+28)+'-06-01').rating,c:pAttr(+k,(g.born+36)+'-06-01').rating};})()`);
ok(yp.a>=yp.b&&yp.c>=yp.b,'a generated bowler peaks in his late twenties ('+JSON.stringify(yp)+')');
const root=G(`+Object.keys(WORLD.players).find(k=>WORLD.players[k][0]==='JE Root')`);
ok(G(`genP(${root})&&genP(${root}).real`),'real players join the pool');
ok(G(`S.rk.awards[2027]&&S.rk.awards[2027].coty`),'awards carry on in the future');
ok(G(`teamRanking('ODI').length`)>8,'rankings carry on');
w.go('fixtures');w.eval(`FX_F.year='2028';FX_F.status='all';rerender()`);ok($('#view').innerHTML.includes('2028')&&!$('#view').innerHTML.includes('Something went wrong'),'future fixtures listed');
const kid=G(`+Object.keys(S.gen.players).find(k=>!S.gen.players[k].real)`);w.openPlayer(kid);ok($('#modal-box').innerHTML.includes('potential'),'player card shows age and potential');w.closeModal();
// compaction keeps scorecards
const n=G('compactArchive(100)');
ok(n>0&&G(`S.matches[0].inns[0].bt.length>0&&!S.matches[0].inns[0].mu`),'trimming old matches keeps the scorecard, drops the matchups');
ok(G('saveGame()'),'career saves');
G(`S.settings.future='off'`);
ok(G(`(()=>{for(const x of allFixtures())if(x.playable&&!S.done[x.key])S.done[x.key]='x';return ensureFuture();})()`)===false,'future off: the calendar stops');
console.log(fail?`e2e20: ${fail} failing`:'e2e20 ok');
process.exit(fail?1:0);
