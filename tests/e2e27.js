// e2e27: relive history and real batting - the Cricsheet importers keep famous chases' real positions and batting
// colours from real averages; Challenges -> Relive history starts the real match from a real moment (real XIs,
// venue, first innings and the pair at the crease), says what really happened; without the data it says how to get it.
const {execFileSync}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fxi-'));
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const world=path.join(tmp,'world.json'),zip=path.join(tmp,'odis_json.zip'),html=path.join(tmp,'game.html');
fs.copyFileSync(path.join(root,'data/world.json'),world);
execFileSync('python3',['-I',path.join(__dirname,'fixtures/make_cricsheet_famous_sample.py'),world,zip]);
const out=execFileSync('python3',['-I',path.join(root,'tools/cricsheet_odis.py'),zip,world]).toString();
ok(/real results for 12 fixtures.*1 famous matches/.test(out),'importer: '+out.trim());
const bout=execFileSync('python3',['-I',path.join(root,'tools/cricsheet_batting.py'),zip,world]).toString();
ok(/batting from \d+ innings by \d+ players/.test(bout),'batting importer: '+bout.trim());
const W=JSON.parse(fs.readFileSync(world,'utf8'));
const byName=n=>Object.entries(W.players).find(([,p])=>p[0]===n);
const tres=byName('ME Trescothick'),coll=byName('PD Collingwood');
ok(tres&&tres[1][5]==='B'&&tres[1][6]==='c','an opener averaging 45 is BLUE, from real averages');
ok(coll&&coll[1][5]==='G'&&coll[1][6]==='c','a No.6 averaging 20 is GREEN');
execFileSync('node',[path.join(root,'tools/build.js'),html,world]);
const boot=f=>new JSDOM(fs.readFileSync(f,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const w=boot(html),G=k=>w.eval(k),$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
$('#sp-go').click();
// real averages: no position lift
const red=G(`(()=>{const e=Object.entries(WORLD.players).find(([,p])=>p[6]==='c'&&p[5]==='R');return e?+e[0]:0;})()`);
if(red){G(`S.settings.ratings='career'`);ok(G(`batColour({batMode:'player',date:'2006-06-01'},${red},3,1)`)==='G','a real RED at No.3 is lifted one step, as derived colours are');G(`S.settings.ratings='era'`);}
else ok(false,'a RED batter from real averages');
// the Relive tab
w.go('play');$('[data-pt="relive"]').click();
ok(G('famousMatches().length')===1&&$$('[data-rl]').length>=2,'one famous match with its moments');
ok(/In reality: .* won by 3 wickets/.test($('#view').textContent),'what really happened');
const cid=G('famousMatches()[0].f.cid'),pos=G(`WORLD.real['${cid}'].pos`);
const late=pos.find(p=>p[0]===60);
$(`[data-rl="${cid}:60"]`).click();
ok(G('!!S.sandbox&&S.sandbox.def.real&&LM&&LM.challenge'),'a relive starts in the sandbox');
const st=JSON.parse(G(`(()=>{const I=LM.inns[1],J=LM.inns[0],f=FIX.find(x=>x.cid==='${cid}');return JSON.stringify({runs:I.runs,wkts:I.wkts,lb:I.lb,target:I.target,st:I.st,ns:I.ns,
  sr:I.bt[I.st].r,sb:I.bt[I.st].b,nr:I.bt[I.ns].r,nb:I.bt[I.ns].b,bat:Object.values(I.bt).reduce((a,b)=>a+b.r,0),ex:I.ex.b+I.ex.lb+I.ex.wd+I.ex.nb,
  j:[J.runs,J.wkts,J.lb],venue:LM.venue==f.venue,xiA:JSON.stringify(LM.xi[f.a].bat)===JSON.stringify(fixtureXI('${cid}',f.a).bat),xiB:JSON.stringify(LM.xi[f.b].bat)===JSON.stringify(fixtureXI('${cid}',f.b).bat)});})()`));
ok(st.target===pos[0][1]&&st.runs===pos[0][1]-late[1]&&st.wkts===late[2]&&st.lb===300-60,'the real position: need '+late[1]+' off 60, '+late[2]+' down');
ok(st.st===late[3]&&st.sr===late[4]&&st.sb===late[5]&&st.ns===late[6]&&st.nr===late[7],'the real pair at the crease with their scores');
ok(st.bat+st.ex===st.runs,'the batting card adds up ('+st.bat+'+'+st.ex+' = '+st.runs+')');
ok(st.j[0]===pos[0][1]-1&&st.j[1]===9&&st.j[2]===300,'the real first innings');
ok(st.venue&&st.xiA&&st.xiB,'the real venue and XIs');
// play it out: the result says what really happened
$('#c-sim').click();
setTimeout(()=>{
  ok(/In reality:/.test($('#modal-box').textContent),'the result banner tells you what really happened');
  // without the data: instructions
  const bare=path.join(tmp,'bare.json'),bareHtml=path.join(tmp,'bare.html'),Wd=JSON.parse(fs.readFileSync(path.join(root,'data/world.json'),'utf8'));delete Wd.real;fs.writeFileSync(bare,JSON.stringify(Wd));
  execFileSync('node',[path.join(root,'tools/build.js'),bareHtml,bare]);
  const w2=boot(bareHtml);w2.document.querySelector('#sp-go').click();
  w2.go('play');w2.document.querySelector('[data-pt="relive"]').click();
  ok(/cricsheet_odis\.py/.test(w2.document.querySelector('#view').textContent),'no data: how to get it');
  console.log(fail?`e2e27: ${fail} failing`:'e2e27 ok');
  process.exit(fail?1:0);
},300);
