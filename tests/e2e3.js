// e2e3: the Cricsheet Test importer - a sample tests_json.zip is imported into a copy of world.json,
// built, and the real Tests show up in the career with their XIs and play out.
const {execFileSync}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fxi-'));
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const world=path.join(tmp,'world.json'),zip=path.join(tmp,'tests_json.zip'),html=path.join(tmp,'game.html');
fs.copyFileSync(path.join(root,'data/world.json'),world);
execFileSync('python3',['-I',path.join(__dirname,'fixtures/make_cricsheet_sample.py'),world,zip]);
const out=execFileSync('python3',['-I',path.join(root,'tools/cricsheet_tests.py'),zip,world]).toString();
ok(/added 2 Tests/.test(out),'importer adds two Tests: '+out.trim());
execFileSync('node',[path.join(root,'tools/build.js'),html,world]);
const w=new JSDOM(fs.readFileSync(html,'utf8'),{runScripts:'dangerously',url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k);
w.document.querySelector('#sp-go').click();
const real=G(`allFixtures().filter(x=>x.real&&x.fmt==='TEST').map(x=>x.key+'|'+x.title+'|'+x.label)`);
ok(real.length===2&&real[0]==='r1|The Ashes 2003 (Tests)|1st Test','real Tests in the calendar: '+real.join(', '));
const xi=G(`(()=>{const M=buildMatch(fixtureByKey('r1'));return{bat:M.xi[4].bat.map(pName),wk:pName(M.xi[4].wk),cap:pName(M.xi[4].cap)};})()`);
ok(xi.bat[10]==='ZZ Debutant','new player added for the debutant');
ok(xi.wk==='AJ Strauss','keeper from the stumping');
ok(xi.cap&&xi.bat.includes(xi.cap),'captain filled from the nearest ODI XI');
G(`for(const k of['r1','r2'])simFixture(fixtureByKey(k))`);
ok(G(`S.matches.filter(m=>m.fmt==='TEST').length`)===2,'both real Tests play');
ok(/\d/.test(G(`seriesStatus(fixtureByKey('r1').sid).text`)),'series status for the real Tests');
w.go('fixtures');w.eval(`FX_F.fmt='TEST';FX_F.status='all';FX_F.year='2003';rerender()`);
ok(w.document.querySelector('#view').innerHTML.includes('The Ashes 2003'),'fixtures screen lists them');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(fail?`e2e3: ${fail} failing`:'e2e3 ok');
process.exit(fail?1:0);
