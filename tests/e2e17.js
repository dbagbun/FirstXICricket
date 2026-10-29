// e2e17: backups - the dashboard nags after 100 matches without a backup, "Back up now" clears it,
// Settings shows backup state; from disk (not http) no manifest or service worker is added.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'file:///home/me/first-xi.html',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.URL.createObjectURL=()=>'blob:x';w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
ok(!w.document.querySelector('link[rel=manifest]'),'no manifest link when opened from disk');
G(`for(const fx of allFixtures().filter(x=>x.playable).slice(0,99))simFixture(fx)`);w.go('home');
ok(!$('#bk-now'),'no backup nag before 100 matches');
G(`simFixture(nextFixture())`);w.go('home');
ok($('#bk-now'),'backup nag after 100 matches');
$('#bk-now').click();
ok(G('S.backupAt')===100&&!G('backupDue()'),'backing up clears it');
w.go('home');ok(!$('#bk-now'),'nag gone');
w.go('settings');ok($('#view').innerHTML.includes('Last backup at match 100'),'settings shows the last backup');
console.log(fail?`e2e17: ${fail} failing`:'e2e17 ok');
process.exit(fail?1:0);
