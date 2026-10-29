// e2e4: batting colours - the colour rules, classic mode, editing a colour on the player card,
// the commentary explaining a survived wicket card, and the full-member v associate balance.
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'dist/first-xi.html','utf8');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const w=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(w){w.confirm=()=>true;w.scrollTo=()=>{};
  w.addEventListener('error',e=>{fail++;console.log('PAGE ERROR',e.message);});}}).window;
const G=k=>w.eval(k),$=s=>w.document.querySelector(s);
$('#sp-go').click();
// colour rules
ok(G(`wicketCounts('B','BLUE')&&!wicketCounts('B','GREEN')&&!wicketCounts('B','RED')`),'BLUE falls only to BLUE');
ok(G(`wicketCounts('G','BLUE')&&wicketCounts('G','GREEN')&&!wicketCounts('G','RED')`),'GREEN falls to BLUE or GREEN');
ok(G(`wicketCounts('R','RED')&&wicketCounts('R','GREEN')&&wicketCounts('R','BLUE')`),'RED falls to anything');
const pid=n=>G(`+Object.keys(WORLD.players).find(k=>WORLD.players[k][0]===${JSON.stringify(n)})`);
const tendulkar=pid('SR Tendulkar'),mcgrath=pid('GD McGrath'),kenyan=pid('KO Otieno');
ok(G(`pAttr(${tendulkar}).bat`)==='B'&&G(`pAttr(${mcgrath}).bat`)==='R'&&G(`pAttr(${kenyan}).bat`)==='BG','derived colours (Tendulkar B, McGrath R, Otieno BG)');
const M={batMode:'player'};w.__M=M;
ok(G(`batColour(__M,${mcgrath},3,1)`)==='B','a derived colour is never weaker than his position (McGrath at 3 = BLUE)');
ok(G(`batColour(__M,${tendulkar},10,1)`)==='B','a top-order batter at 10 stays BLUE');
ok(G(`batColour(__M,${kenyan},1,1)`)==='G','an unproven associate opener is GREEN against a Test nation');
ok(G(`batColour(__M,${kenyan},1,13)`)==='B','...and BLUE against an associate');
M.batMode='position';
ok(G(`batColour(__M,${tendulkar},10,1)`)==='R'&&G(`batColour(__M,${kenyan},1,1)`)==='B','classic mode is by position only');
// a colour you set applies exactly
G(`S.attrEdits[${tendulkar}]={bat:'R'}`);M.batMode='player';
ok(G(`batColour(__M,${tendulkar},1,1)`)==='R','an edited colour applies exactly');
ok(G(`pAttr(${tendulkar}).style`)==='S','editing the colour keeps the bowling attributes');
G(`delete S.attrEdits[${tendulkar}]`);
// player card edit through the UI
w.openPlayer(tendulkar);
ok($('#modal-box').innerHTML.includes('Batting: <b>BLUE'),'player card shows the colour');
$('#pa-edit').click();$('#pa-bat').value='G';$('#pa-save').click();
ok(G(`pAttr(${tendulkar}).bat`)==='G'&&G(`pAttr(${tendulkar}).batSrc`)==='e','colour edited from the player card');
w.closeModal();G(`delete S.attrEdits[${tendulkar}]`);
// played match: every survived wicket card is explained by the batter's colour
w.startFixture(G('nextFixture().key'));
ok($('#view').innerHTML.includes('bchip'),'pre-match XIs show colour chips');
$('#toss-go').click();$('#c-sim').click();
const E=G('S.matches[0]');
const vb=G(`(()=>{const M=LM;return M.inns.flatMap(I=>I.balls.filter(b=>b.voided||b.w).map(b=>({v:b.voided,c:b.bcol,col:String(b.tok).split('_')[1]})));})()`);
ok(vb.length>0&&vb.every(b=>b.v?!G(`wicketCounts('${b.c}','${b.col}')`):G(`wicketCounts('${b.c}','${b.col}')`)),'every wicket card is decided by the batter\'s colour ('+vb.length+')');
w.closeModal();
w.eval(`MATCH_TAB='comm';go('match')`);
ok(!vb.some(b=>b.v)||$('#mtab').innerHTML.includes('and survives'),'commentary explains a survived wicket card');
// balance: full members v associates across the real calendar
const r=G(`(()=>{const full=new Set(WORLD.teams.filter(t=>t.full).map(t=>t.id));let n=0,wn=0;
  for(const fx of allFixtures()){if(fx.fmt!=='ODI'||!fx.playable||S.done[fx.key]||full.has(fx.a)===full.has(fx.b))continue;
    const M=simFixture(fx);n++;if(full.has(M.result.winner))wn++;}return{n,p:wn/n};})()`);
console.log(`full members beat associates ${(100*r.p).toFixed(0)}% of ${r.n}`);
ok(r.p>=.7&&r.p<=.92,'full members win 70-92% against associates');
const sc=G(`(()=>{const full=new Set(WORLD.teams.filter(t=>t.full).map(t=>t.id));const a=S.matches.filter(E=>E.fmt==='ODI'&&!full.has(E.inns[0].bat)&&full.has(E.inns[0].bowl)).map(E=>E.inns[0].runs);return a.reduce((x,y)=>x+y,0)/a.length;})()`);
ok(sc>140&&sc<220,'associates batting first v Test nations average '+sc.toFixed(0));
console.log(fail?`e2e4: ${fail} failing`:'e2e4 ok');
process.exit(fail?1:0);
