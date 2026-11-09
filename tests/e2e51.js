// e2e51: what really happened for every format (WORLD.real for real Tests and T20Is, tools/real_summary.py, found by
// date and teams so older saves get it too), and relive any real ODI or T20I chase from the start of any over
// (07l chaseAt / reliveAnyDef, from the real scorecards).
const {JSDOM}=require('jsdom'),fs=require('fs');
const {Blob}=require('buffer');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.DecompressionStream=DecompressionStream;w.Response=Response;w.Blob=Blob;
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
const wait=async(f,ms=120000)=>{const t=Date.now();while(!G(f)){if(Date.now()-t>ms)return false;await new Promise(r=>setTimeout(r,50));}return true;};
(async()=>{
  $('#sp-go').click();
  // 1. what really happened: Tests and T20Is
  const n=G(`REAL_TEST_FX.filter(x=>WORLD.real[x.f.cid]).length`),m=G(`REAL_T20_FX.filter(x=>WORLD.real[x.f.cid]).length`);
  ok(n>800&&m>1200,'real results for '+n+' Tests and '+m+' T20Is');
  G(`for(let i=0;i<3000;i++){const fx=nextFixture();if(fx.date>'2007-01-03')break;simFixture(fx);}`);
  const T=G(`(()=>{const E=S.matches.find(E=>E.fmt==='TEST'&&E.date==='2007-01-02');return E&&{you:E.result.text,real:realText(realOf(E)),same:sameAsHistory(E)};})()`);
  ok(T&&T.real==='South Africa won by 5 wickets','Cape Town 2007, really: '+(T&&T.real));
  const I=G(`(()=>{const E=S.matches.find(E=>E.fmt==='T20');return E&&realOf(E)?realText(realOf(E)):'';})()`);
  ok(/won by/.test(I),'the first T20I has its real result: '+I);
  ok(G(`realText({r:[3,'inns',85,0]})`)===G('teamName(3)')+' won by an innings and 85 runs'&&G(`realText({r:[0,'draw',0,0]})`)==='Match drawn'&&/won the super over/.test(G(`realText({r:[0,'tie',0,0],so:4})`)),'Test and super-over wording');
  ok(G(`(()=>{const E=S.matches.find(E=>E.fmt==='TEST'&&realOf(E)&&realOf(E).r[1]==='draw');return!E||sameAsHistory(E)===(E.result.type==='draw');})()`),'a drawn Test matches a draw');
  const D=G(`(()=>{const by={};for(const E of S.matches){const s=sameAsHistory(E);if(s!==null)by[E.fmt]=(by[E.fmt]||0)+1;}return by;})()`);
  ok(D.ODI>100&&D.TEST>20&&D.T20>0,'the timeline v history counts all three formats '+JSON.stringify(D));
  G(`openScorecard(S.matches.find(E=>E.fmt==='TEST'&&E.date==='2007-01-02').id)`);ok(/What really happened/.test($('#modal-box').textContent),'on the Test scorecard');G(`closeModal()`);
  // an older save: archived matches carry no match id, the date and teams find it
  ok(G(`(()=>{const E=JSON.parse(JSON.stringify(S.matches.find(E=>E.fmt==='T20')));delete E.id;return!!realOf(E);})()`),'found by date and teams');
  // 2. relive any match from any over
  G(`go('play');PLAY_TAB='relive';RELIVE.mode='any';rerender()`);
  ok(await wait(`!!HIST&&!!document.querySelector('[data-rag]')`),'the real scorecards unpack and the list shows');
  const p=G(`(()=>{const fx=reliveAnyList().find(x=>x.date==='2019-07-14'&&x.fmt==='ODI');const c=chaseAt(HIST[fx.f.cid],fx.f.cid,23);c[3]=pName(c[3]);c[6]=pName(c[6]);return c;})()`);
  ok(p[0]===162&&p[1]===156&&p[2]===3&&p[3]==='BA Stokes'&&p[6]==='EJG Morgan','2019 final after 23 overs: 86/3, Stokes and Morgan in ('+p.join(',')+')');
  const L=G(`(()=>{const fx=reliveAnyList().find(x=>x.date==='2019-07-14'&&x.fmt==='ODI');startChallenge(reliveAnyDef(fx,HIST[fx.f.cid],23,'chase'));const M=S.live,I=M.inns[1];
    return{f:M.inns[0].runs,r:I.runs,w:I.wkts,lb:I.lb,t:I.target,st:pName(I.st),ns:pName(I.ns),you:M.you,fmt:M.fmt};})()`);
  ok(L.f===241&&L.r===86&&L.w===3&&L.lb===138&&L.t===242,'the match is set up as it stood: '+JSON.stringify(L));
  ok(L.st==='BA Stokes'&&L.ns==='EJG Morgan'&&L.fmt==='ODI','the real pair at the crease');
  ok(G(`(()=>{const M=S.live;simMatch(M);return M.state==='done';})()`),'it plays to a finish');
  G(`leaveSandbox&&leaveSandbox()`);
  const T2=G(`(()=>{const fx=reliveAnyList().find(x=>x.fmt==='T20'&&x.date>'2022');const d=reliveAnyDef(fx,HIST[fx.f.cid],10,'defend');startChallenge(d);const M=S.live;simMatch(M);
    return{fmt:M.fmt,mo:M.maxOv,done:M.state,you:M.you===d.bowl,res:M.result&&M.result.text};})()`);
  ok(T2.fmt==='T20'&&T2.mo===20&&T2.done==='done'&&T2.you,'a T20I from over 11, bowling: '+JSON.stringify(T2));
  console.log(fail?`e2e51: ${fail} failing`:'e2e51 ok');process.exit(fail?1:0);
})();
