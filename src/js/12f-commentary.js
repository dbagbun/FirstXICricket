// ═══ COMMENTARY, HIGHLIGHTS & SHARE IMAGES ═══
// Phrases are picked by a hash of the ball (not Math.random), so seeded runs stay repeatable.
const COMM={
  0:{P:['defended solidly','beaten outside off','left alone','driven straight to mid-off','fended away off the hip','a good length, no run'],S:['pushed back to the bowler','beaten by the turn','defended off the front foot','padded away','turned to short leg','flighted, blocked']},
  // [phrase, part of the ground] - the phrase is picked for the zone the wagon wheel draws (shotOf)
  1:[['worked into the leg side for one','midwicket'],['dabbed to third man','third'],['pushed into the covers and they scamper one','cover'],['nudged off the pads','fine'],
    ['tapped to mid-off and run','offdrive'],['turned to square leg for a single','square'],['cut to deep point, one','point'],['driven down to long-on, one','onside'],['pushed back past the bowler for one','straight']],
  2:[['driven through the gap, they come back for two','cover'],['clipped to deep square, two','square'],['placed wide of long-on for a couple','onside'],['pulled into the deep, two','midwicket'],
    ['cut hard, two to deep point','point'],['glanced fine, they run two','fine'],['driven straight, back for two','straight'],['steered to third man, two','third'],['pushed wide of mid-off, two','offdrive']],
  3:[['driven hard, three','cover'],['chased down just inside the rope - three','midwicket'],['misfield in the deep, three',''],['cut to the sweeper, three','point'],['clipped fine, three','fine']],
  4:{P:[['FOUR! Crunched through the covers','cover'],['FOUR! Pulled in front of square','midwicket'],['FOUR! Off the edge, past the slips','third'],['FOUR! Driven straight past the bowler','straight'],['FOUR! Cut away fiercely','point'],
      ['FOUR! Flicked off the pads to fine leg','fine'],['FOUR! Clipped square','square'],['FOUR! Lofted over mid-on','onside'],['FOUR! Driven on the up past mid-off','offdrive']],
    S:[['FOUR! Swept fine','fine'],['FOUR! Dancing down and lofting over mid-on','onside'],['FOUR! Cut late past point','point'],['FOUR! Reverse-swept!','point'],['FOUR! Driven through extra cover','cover'],
      ['FOUR! Slog-swept to midwicket','midwicket'],['FOUR! Driven straight','straight'],['FOUR! Swept square','square'],['FOUR! Down the track, over mid-off','offdrive'],['FOUR! Late cut to third man','third']]},
  6:{P:[['SIX! Pulled into the stands','midwicket'],['SIX! Clubbed over long-on','onside'],['SIX! Upper-cut over third man','third'],['SIX! Lofted over extra cover','cover'],['SIX! Straight back over the bowler','straight'],
      ['SIX! Hooked over fine leg','fine'],['SIX! Smashed over long-off','offdrive'],['SIX! Hit over square leg','square'],['SIX! Carved over point','point']],
    S:[['SIX! Down the track and over long-off','offdrive'],['SIX! Slog-swept into the crowd','midwicket'],['SIX! Launched over the sightscreen','straight'],['SIX! Inside-out over extra cover','cover'],['SIX! Lofted over long-on','onside'],
      ['SIX! Swept over square leg','square'],['SIX! Reverse-swept over point','point'],['SIX! Paddled over fine leg','fine'],['SIX! Upper-cut over third man','third']]},
  wd:['wide, down the leg side','wide - too far outside off'],nb:['no-ball, overstepped','no-ball - free hit'],lb:['off the pad, leg bye','leg byes'],b:['through to the keeper, byes','byes'],
  w:{b:['BOWLED! Through the gate','BOWLED! Middle stump out of the ground'],lbw:['LBW! Trapped in front','LBW! Plumb'],ct:['CAUGHT! Taken low','CAUGHT! Straight to the fielder'],
    ctof:['CAUGHT in the deep!','CAUGHT! Holed out'],ctwk:['CAUGHT BEHIND! Thin edge','CAUGHT BEHIND! Feathered it'],st:['STUMPED! Down the track and missed it'],ro:['RUN OUT! Sent back too late','RUN OUT! Direct hit!']},
};
function hashBall(b){return((b.over||0)*31+(b.n||0)*17+(b.roll||0)*7+(b.col||0)*3+(b.inn||0)*11)>>>0;}
function phrase(b,style){
  const h=hashBall(b),one=l=>l[h%l.length],st=style==='S'?'S':'P';
  if(b.w){const l=COMM.w[b.how]||COMM.w.b;return one(l);}
  if(b.exType)return one(COMM[b.exType]);
  const x=COMM[b.bat]||COMM[0],l=Array.isArray(x)?x:x[st];
  if(!Array.isArray(l[0]))return one(l);
  const z=shotOf(b,style),near=l.filter(p=>p[1]===(z&&z.zone));
  return(near.length?near[h%near.length]:one(l))[0];
}
// Ball line for the live commentary: phrase, then the card, roll and column it came from.
function commLine(b,M){
  const style=pAttr(b.bowler,M&&M.date).style,ph=phrase(b,style);
  const who=`${esc(pName(b.bowler))} to ${esc(pName(b.st))}`;
  let t=b.w?`<span class="w">${ph}</span> ${dismissalText(b.how,b.bowler,b.fielder||0)}`
    :b.voided?`<span class="sub">${esc(String(b.tok).split('_')[1]||'')} wicket on the card - ${esc(pName(b.st))} is ${BAT_NAME[b.bcol]||'?'} and survives</span>`
    :b.bat>=4?`<b>${ph}</b>`:ph;
  const ev=(b.ev||[]).filter(e=>e.t!=='innsEnd'&&e.t!=='w').map(e=>' <span class="ms">'+evText(e)+'</span>').join('');
  return`<div><span class="ov">${b.over-1}.${b.legal||b.n}</span>${who}, ${t}${ev} <span class="muted mono" style="font-size:11px">RR_${b.card} · ${b.roll} · c${b.col}</span></div>`;
}
// End-of-over summary, from the innings state after that over
function overSummary(M,I,o){
  const ballsTo=I.balls.filter(b=>b.over<=o.over),last=ballsTo[ballsTo.length-1];if(!last)return'';
  const W=I.bw[o.bowler]||{b:0,md:0,r:0,w:0};
  return`<div class="sub" style="background:rgba(30,41,59,.6);padding:4px 8px;border-radius:6px">End of over ${o.over} (RR_${o.card}): ${plural(o.runs,'run')}${o.w?', '+plural(o.w,'wicket'):''} · <b>${esc(teamShort(I.bat))} ${last.runs}/${last.wkts}</b> · ${esc(pName(o.bowler))} ${oversTxt(W.b)}-${W.md}-${W.r}-${W.w}</div>`;
}
function commentaryHTML(M){
  const rows=[];
  for(const I of M.inns){
    const byOver=new Map(I.overs.map(o=>[o.over,o]));
    for(const b of I.balls){
      rows.push(commLine({...b,pos:I.order.indexOf(b.st)+1},M));
      const o=byOver.get(b.over);
      if(o&&b===I.balls.filter(x=>x.over===b.over).slice(-1)[0])rows.push(overSummary(M,I,o));
    }
  }
  return rows.slice(-220).reverse().join('');
}

// ---------- highlights: from a live match, or the ball log kept for recent matches ----------
function highlightsOf(E,M){
  const out=[];
  const balls=M?M.inns.flatMap(I=>I.balls.map(b=>({...b,inn:I.no,bat:I.bat,bowl:I.bowl}))):(S.logs[E.id]||[]).flatMap((L,k)=>L.map(r=>({inn:k+1,over:r[0],legal:r[1],card:r[2],roll:r[3],col:r[4],tok:r[5],st:r[6],bowler:r[7],runs:r[8],wkts:r[9],how:r[10],voided:r[11],w:r[10]?1:0,bat:E.inns[k].bat})));
  const names=E?E.inns:M.inns;
  for(const b of balls){
    const six=b.bat===6||String(b.tok)==='6',four=String(b.tok)==='4';
    if(b.w||b.how)out.push({k:'w',b,text:`${pName(b.st)} ${dismissalText(b.how,b.bowler,b.fielder||0)}`,score:`${teamShort(b.bat)} ${b.runs}/${b.wkts}`});
    else if(six)out.push({k:'6',b,text:`${pName(b.st)} hits ${pName(b.bowler)} for six`,score:`${teamShort(b.bat)} ${b.runs}/${b.wkts}`});
    else if(four&&b.over>=(names[b.inn-1]&&names[b.inn-1].mo?names[b.inn-1].mo-5:45))out.push({k:'4',b,text:`${pName(b.st)} finds the rope at the death`,score:`${teamShort(b.bat)} ${b.runs}/${b.wkts}`});
  }
  for(const e of(E?E.ev:[]))if(['50','100','200','5w','hat'].includes(e[0]))out.push({k:'ms',text:`${pName(e[1])}: ${e[0]==='5w'?'five wickets':e[0]==='hat'?'a hat-trick':e[0]==='200'?'double hundred':e[0]==='100'?'hundred':'fifty'}`,inn:e[2]});
  return out;
}
let HL_TIMER=null;
function playHighlights(E){
  const H=highlightsOf(E,null).filter(h=>h.k!=='4').slice(0,24);
  if(!H.length){toast('No ball-by-ball log kept for this match (only the last '+LOG_KEEP+' matches keep one).','warn');return;}
  clearTimeout(HL_TIMER);let i=0;FX.allow=true;
  const step=()=>{
    if(i>=H.length){tvBanner('res','RESULT',esc(E.result.text));SFX.applause(2);return;}
    const h=H[i++];
    tvBanner(h.k==='w'?'wkt':'ms',h.k==='w'?'WICKET':h.k==='6'?'SIX':'MILESTONE',`${esc(h.text)}${h.score?' · <b>'+esc(h.score)+'</b>':''}`);
    if(h.k==='w')SFX.roar(1,1.2);else if(h.k==='6'){SFX.crack(1);SFX.roar(.8,1.2);}else SFX.applause(1.2);
    HL_TIMER=setTimeout(step,1700);
  };
  step();
}
function highlightsListHTML(E){
  const H=highlightsOf(E,null).filter(h=>h.k!=='4');
  if(!H.length)return`<p class="muted">No ball-by-ball log for this match (the last ${LOG_KEEP} matches keep one).</p>`;
  return H.map(h=>`<div>${h.k==='w'?'☝️':h.k==='6'?'💥':'🏅'} ${h.b?`<span class="muted mono">${h.b.over-1}.${h.b.legal}</span> `:''}${esc(h.text)} ${h.score?`<span class="muted">${esc(h.score)}</span>`:''}</div>`).join('');
}

// ---------- share images (PNG via canvas) ----------
function canvasCard(title,sub,blocks,foot){
  const W=1080,pad=56,c=document.createElement('canvas');
  const lineH=40,h=pad*2+120+blocks.reduce((a,b)=>a+60+b.rows.length*lineH,0)+60;
  c.width=W;c.height=h;const g=c.getContext&&c.getContext('2d');if(!g)return null;
  g.fillStyle='#0a0e1a';g.fillRect(0,0,W,h);
  g.fillStyle='#06b6d4';g.fillRect(0,0,W,10);
  const H='"Barlow Condensed", system-ui, sans-serif',B='"Barlow", system-ui, sans-serif';
  g.fillStyle='#f8fafc';g.font='700 52px '+H;g.fillText(title,pad,pad+40);
  g.fillStyle='#94a3b8';g.font='26px '+B;g.fillText(sub,pad,pad+84);
  let y=pad+140;
  for(const b of blocks){
    g.fillStyle='#ffd700';g.font='700 32px '+H;g.fillText(b.head.toUpperCase(),pad,y);y+=46;
    for(const r of b.rows){g.fillStyle='#f8fafc';g.font='26px '+B;g.fillText(r[0],pad,y);
      if(r[1]!=null){g.textAlign='right';g.fillStyle='#67e8f9';g.font='700 30px '+H;g.fillText(String(r[1]),W-pad,y);g.textAlign='left';}
      y+=lineH;}
    y+=14;
  }
  g.fillStyle='#64748b';g.font='22px '+B;g.fillText(foot||'First XI Cricket',pad,h-pad/2);
  return c;
}
function downloadCanvas(c,name){
  if(!c){toast('Images need a browser with canvas support.','warn');return false;}
  const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=name;a.click();return true;
}
function scorecardImage(E){
  const blocks=E.inns.map(I=>({head:`${teamName(I.bat)} ${I.runs}${I.wkts<10?'/'+I.wkts:''}${I.why==='declared'?'d':''} (${oversTxt(I.lb)} ov)`,
    rows:[...I.bt.slice().sort((a,b)=>b[1]-a[1]).slice(0,3).map(r=>[pName(r[0]),r[1]+(r[5]?'':'*')+' ('+r[2]+')']),
      ...I.bw.slice().sort((a,b)=>b[4]-a[4]||a[3]-b[3]).slice(0,2).map(w=>[pName(w[0])+' (bowling)',w[4]+'/'+w[3]])]}));
  if(E.motm)blocks.push({head:'Man of the Match',rows:[[pName(E.motm),null]]});
  return canvasCard(E.result.text,`${E.series||'Friendly'}${E.stage?' · '+E.stage:''} · ${E.venue} · ${fmtDate(E.date)}`,blocks,'First XI Cricket · your timeline');
}
