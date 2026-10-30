// e2e26: field view, wagon wheels and pitch maps - shots drawn the same live and from the ball log, commentary
// phrases that match the part of the ground, fields that follow the format, phase and your Field setting.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();
// geometry is a pure function of the ball
ok(G(`JSON.stringify(shotOf({over:3,legal:2,roll:40,col:2,inn:1,bat:4},'P'))===JSON.stringify(shotOf({over:3,legal:2,roll:40,col:2,inn:1,bat:4},'P'))`),'the same ball, the same shot');
ok(G(`shotOf({over:3,legal:2,roll:40,col:2,inn:1,bat:0},'P')`)===null,'no shot for a dot');
ok(G(`(()=>{for(let i=0;i<400;i++){const b={over:i%50,legal:1+i%6,roll:1+i%100,col:1+i%6,inn:1,bat:[1,2,4,6][i%4]},s=shotOf(b,'P');if(!ZONES[s.zone]||s.ang<0||s.ang>=360)return false;
  const p=pitchOf(b,'S');if(p.len<0||p.len>13||Math.abs(p.line)>1.1)return false;}return true;})()`),'shots and pitches stay on the ground');
ok(G(`(()=>{const z={};for(let i=0;i<2000;i++){const s=shotOf({over:i,legal:i%6+1,roll:i%100+1,col:i%6+1,inn:1,bat:4},'P');z[s.zone]=1;}return Object.keys(z).length;})()`)===9,'every part of the ground gets used');
// the phrase follows the shot
ok(G(`(()=>{for(let i=0;i<300;i++){const b={over:i,legal:i%6+1,n:i%6+1,roll:i%100+1,col:i%6+1,inn:1,bat:[4,6][i%2]};const z=shotOf(b,'P').zone,ph=phrase(b,'P');
  const list=COMM[b.bat].P.filter(p=>p[1]===z).map(p=>p[0]);if(list.length&&!list.includes(ph))return false;}return true;})()`),'boundary commentary matches the wagon wheel');
// a live ODI
w.startFixture(G('nextFixture().key'));$('#toss-go').click();
G(`FX.allow=false`);
for(let i=0;i<3;i++)$('#c-over').click();
ok(G(`fieldFor(LM).key`)==='pp','powerplay field early in an ODI: '+G(`fieldFor(LM).key`));
$('[data-tab="field"]').click();
ok($('#mtab .ground')&&$$('#mtab .f-man').length===9,'the field: nine fielders');
ok($$('#mtab svg.ground').length===2&&$('#mtab .pitchmap'),'field, wagon wheel and pitch map');
const live=JSON.parse(G(`(()=>{const I=LM.inns[0],tot=inningsBalls(archiveMatch(LM),LM,0).filter(b=>b.bat>0).reduce((a,b)=>a+b.bat,0);
  return JSON.stringify({tot,bat:I.runs-I.ex.b-I.ex.lb-I.ex.wd-I.ex.nb});})()`));
ok(live.tot===live.bat,'the wagon wheel adds up to the runs off the bat ('+live.tot+')');
ok(new RegExp(live.bat+' runs').test($('#mtab').textContent),'and says so');
// filter by batter
const st=G('LM.inns[0].st');
const sel=$('#fs-bat');sel.value=String(st);sel.dispatchEvent(new w.Event('change'));
const mine=G(`LM.inns[0].bt[${st}].r`);
ok(new RegExp('^'+mine+' runs').test($('#mtab .muted').textContent.trim())||$('#mtab').textContent.includes(mine+' runs'),"one batter's wagon wheel ("+mine+')');
// phases and your field setting
for(let i=0;i<40;i++)$('#c-over').click();
if(G(`LM.state==='live'&&LM.inns.length===1`)){
  ok(G(`fieldFor(LM).key`)==='death','death field late on: '+G(`fieldFor(LM).key`));
  G(`LM.manualCaptain={[curInn(LM).bowl]:true};LM.att={['f'+curInn(LM).bowl]:-1}`);
  ok(G(`fieldFor(LM).key`)==='death','defending at the death stays on the rope');
  G(`LM.att={['f'+curInn(LM).bowl]:1}`);
  ok(G(`fieldFor(LM).key`)==='mid'||G(`fieldFor(LM).key`)==='midSpin','attacking brings men in');
}
G(`LM.manualCaptain=null;simMatch(LM)`);
// from the ball log: the scorecard modal
const id=G('S.matches.at(-1).id');
G(`openScorecard('${id}')`);
ok($('#sc-field .ground'),'shots and pitch maps on the scorecard');
const arch=JSON.parse(G(`(()=>{const E=S.matches.at(-1),I=E.inns[1],tot=inningsBalls(E,null,1).reduce((a,b)=>a+(b.bat||0),0);return JSON.stringify({tot,bat:I.runs-I.ex[0]-I.ex[1]-I.ex[2]-I.ex[3]});})()`));
ok(arch.tot===arch.bat,'the logged innings adds up too ('+arch.tot+' v '+arch.bat+')');
G('closeModal()');
// a Test: the new ball means slips
G(`createTestSeries({a:4,b:1,n:1,start:'2002-07-01'})`);
const tk=G(`allFixtures().find(x=>x.fmt==='TEST'&&!S.done[x.key]&&x.date>='2002-07-01').key`);
G(`(()=>{const M=buildMatch(fixtureByKey('${tk}'));doToss(M);M.state='live';LM=M;for(let i=0;i<12;i++)bowlBall(M);})()`);
ok(/^testPace|^testSpin/.test(G(`fieldFor(LM).key`))&&G(`fieldFor(LM).key`).endsWith('Att'),'new ball in a Test: an attacking field ('+G(`fieldFor(LM).key`)+')');
// a match older than the log: no maps, a note
ok(G(`fieldTabHTML({id:'none',inns:[{bat:1,bowl:2}],date:'2003-01-01'},null)`).includes('kept for the last'),'old matches say why there are no maps');
console.log(fail?`e2e26: ${fail} failing`:'e2e26 ok');
process.exit(fail?1:0);
