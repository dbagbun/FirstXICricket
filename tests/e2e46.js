// e2e46: generated players get made-up surnames in their nation's style - never a real player's surname, no
// duplicates of a real full name, 5-10 letters.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
w.document.querySelector('#sp-go').click();w.eval('genStore()');
const real=new Set(w.eval(`Object.values(WORLD.players).map(p=>p[0].split(' ').pop().toLowerCase())`));
const full=new Set(w.eval(`Object.values(WORLD.players).map(p=>p[0])`));
for(const c of['AUS','IND','ENG','PAK','SL','WI','BAN','NEP','PNG','JER']){
  const names=w.eval(`(()=>{const t=[...TEAMS.values()].find(x=>x.short==='${c}').id;return Array.from({length:40},()=>genName(t));})()`);
  const sn=names.map(n=>n.split(' ').pop());
  ok(sn.every(s=>!real.has(s.toLowerCase())),c+': no real surnames ('+sn.filter(s=>real.has(s.toLowerCase())).join(',')+')');
  ok(names.every(n=>!full.has(n)),c+': no real names');
  ok(sn.every(s=>/^[A-Z][A-Za-z']{4,10}$/.test(s)),c+': 5-10 letters ('+sn.filter(s=>!/^[A-Z][A-Za-z']{4,10}$/.test(s)).join(',')+')');
  ok(new Set(sn).size>=25,c+': varied ('+new Set(sn).size+'/40)');
}
// the style follows the side: Sri Lankan made-up names end like Sri Lankan ones more often than English ones do
const ends=c=>w.eval(`(()=>{const t=[...TEAMS.values()].find(x=>x.short==='${c}').id;return Array.from({length:150},()=>genName(t).split(' ').pop()).filter(s=>/(ge|ne|ra|na|ya|ha|ka)$/.test(s)).length;})()`);
const sl=ends('SL'),en=ends('ENG');ok(sl>en*2,'Sri Lankan style ('+sl+' v '+en+' of 150 with Sri Lankan endings)');
// a prospect drawn by the world generator uses it too
w.eval(`initFuture();for(const c of['AUS','IND','SL','NAM'])for(let i=0;i<5;i++)newYoungster([...TEAMS.values()].find(x=>x.short===c).id,2027,false)`);const gen=w.eval(`Object.values(S.gen.players).filter(g=>!g.real).map(g=>g.n)`);
ok(gen.length>0&&gen.every(n=>!real.has(n.split(' ').pop().toLowerCase())),'generated pool: made-up surnames ('+gen.filter(n=>real.has(n.split(' ').pop().toLowerCase())).join(',')+')');
console.log(fail?`e2e46: ${fail} failing`:'e2e46 ok');process.exit(fail?1:0);
