// ═══ FIELD VIEW, WAGON WHEELS & PITCH MAPS — drawn from the ball, never touching the dice ═══
// Where a shot went and where a ball pitched are cosmetic: a hash of the ball (over, legal ball, roll, column,
// innings) picks them, so live balls and the kept ball logs (S.logs) draw the same picture, and the commentary
// picks a phrase for the same part of the ground (shotOf -> zone). Angles: 0 = straight back past the bowler,
// clockwise, so 90 is square on the off side (right-hander) and 270 square on the leg side. Radius 1 = the rope.
const ZONES={straight:[345,375],offdrive:[15,45],cover:[45,78],point:[78,115],third:[115,170],fine:[190,240],square:[240,285],midwicket:[285,322],onside:[322,345]};
const ZONE_W={runs:{straight:7,offdrive:12,cover:18,point:12,third:9,fine:10,square:10,midwicket:16,onside:10},
  six:{straight:14,offdrive:14,cover:10,point:4,third:4,fine:8,square:10,midwicket:22,onside:16},
  spin:{straight:6,offdrive:11,cover:15,point:10,third:6,fine:12,square:14,midwicket:18,onside:12}};
const OFF_ZONES=new Set(['offdrive','cover','point','third']);
function geoHash(b,salt){return Math.imul((b.over||0)*131+(b.legal||0)*31+(b.roll||0)*7+(b.col||0)*3+(b.inn||0)*1009+salt*7919+1,2654435761)>>>0;}
const geoFrac=(b,salt)=>(geoHash(b,salt)%10000)/10000;
function shotOf(b,style){
  if(!(b.bat>0))return null;
  const W=ZONE_W[b.bat===6?'six':style==='S'?'spin':'runs'],tot=Object.values(W).reduce((a,c)=>a+c,0);
  let r=geoFrac(b,1)*tot,zone='cover';
  for(const[z,w]of Object.entries(W)){if(r<w){zone=z;break;}r-=w;}
  const[lo,hi]=ZONES[zone],ang=(lo+(hi-lo)*geoFrac(b,2))%360,f=geoFrac(b,3);
  const dist=b.bat===6?1.1+f*.1:b.bat===4?1:b.bat===3?.78+f*.14:b.bat===2?.55+f*.25:b.bat===5?.9:.28+f*.3;
  return{zone,ang,dist};
}
// Where it pitched: len in metres from the batter's stumps (0-13), line -1 (wide down leg) .. +1 (wide outside off).
function pitchOf(b,style){
  const f=geoFrac(b,4),g=geoFrac(b,5),spin=style==='S',s=spin?.85:1;
  let len,line;
  if(b.exType==='wd'){len=4+f*6;line=g<.7?.75+g*.3:-.75-g*.2;}
  else if(b.w&&(b.how==='b'||b.how==='lbw')){len=(2.5+f*4.5)*s;line=-.12+g*.24;}
  else if(b.w&&(b.how==='ctwk'||b.how==='ct')){len=(5.5+f*3)*s;line=.12+g*.3;}
  else if(b.w&&b.how==='st'){len=3+f*2;line=g*.35;}
  else if(b.bat===6||b.bat===4){const short=!spin&&f<.4;len=short?9.5+g*3:(1.5+g*3.5)*s;line=-.3+geoFrac(b,6)*.75;}
  else if(b.bat>0){len=(4+f*5.5)*s;line=-.35+g*.7;}
  else{len=(5.5+f*3)*s;line=.02+g*.32;}
  return{len:Math.min(13,len),line};
}
// ---------- the field ----------
const FPOS={slip1:[160,.17,'1st slip'],slip2:[152,.19,'2nd slip'],slip3:[144,.21,'3rd slip'],gully:[128,.25,'Gully'],point:[95,.36,'Point'],
  cover:[55,.38,'Cover'],midoff:[22,.4,'Mid-off'],midon:[338,.4,'Mid-on'],midwicket:[300,.38,'Midwicket'],sqleg:[265,.36,'Square leg'],
  shortleg:[245,.11,'Short leg'],sillypoint:[110,.11,'Silly point'],legslip:[198,.18,'Leg slip'],third:[145,.95,'Third man'],shortthird:[140,.5,'Short third'],
  fine:[212,.95,'Fine leg'],deeppoint:[95,.95,'Deep point'],deepcover:[55,.95,'Deep cover'],longoff:[18,.95,'Long-off'],longon:[342,.95,'Long-on'],
  deepmid:[305,.95,'Deep midwicket'],deepsq:[265,.95,'Deep square leg'],shortcover:[50,.26,'Short cover']};
const FIELDS={
  testPaceAtt:['Attacking: three slips and a gully',['slip1','slip2','slip3','gully','point','cover','midoff','midon','fine']],
  testPace:['Two slips and a gully',['slip1','slip2','gully','point','cover','midoff','midon','sqleg','fine']],
  testPaceDef:['Defensive: one slip, men out',['slip1','gully','point','cover','midoff','midon','sqleg','deepsq','third']],
  testSpinAtt:['Attacking spin: bat-pad both sides',['slip1','shortleg','sillypoint','legslip','point','cover','midoff','midon','midwicket']],
  testSpin:['Spin: slip and short leg',['slip1','shortleg','point','cover','midoff','midon','midwicket','deepmid','longoff']],
  testSpinDef:['Spin, saving runs',['point','cover','midoff','midon','midwicket','deepmid','longoff','longon','deepsq']],
  ppAtt:['Powerplay, attacking: two slips',['slip1','slip2','gully','point','cover','midoff','midon','midwicket','fine']],
  pp:['Powerplay: two men out',['slip1','point','cover','midoff','midon','midwicket','sqleg','third','fine']],
  mid:['Middle overs: four out',['point','cover','midoff','midon','midwicket','deepcover','deepmid','longon','fine']],
  midSpin:['Middle overs, spin: five out',['point','cover','midoff','midon','midwicket','deepmid','longoff','longon','deepsq']],
  death:['Death: five on the rope',['shortthird','point','shortcover','deepcover','longoff','longon','deepmid','deepsq','fine']],
};
// The field for the coming ball: your Field setting when you captain, otherwise the AI's choice.
function fieldFor(M){
  const I=curInn(M);if(!I)return null;
  const C=M.cur,over=C?C.over:Math.floor(I.lb/6)+1,pid=C?C.bowler:null,style=pid?pAttr(pid,M.date).style:'P';
  let att=M.att&&M.att['f'+I.bowl]!=null&&M.manualCaptain?.[I.bowl]?M.att['f'+I.bowl]:null;
  if(M.fmt==='TEST'){
    if(att==null){const sinceNew=(I.lb/6)%NEW_BALL,lead=testTotals(M,I.bowl)-testTotals(M,I.bat);
      att=sinceNew<15||I.wkts>=7||(I.target&&I.target-I.runs>150)?1:lead<-150&&!I.target?-1:I.target&&I.target-I.runs<40?-1:0;}
    const k=(style==='S'?'testSpin':'testPace')+(att>0?'Att':att<0?'Def':'');return{key:k,over,style};
  }
  const pp=M.fmt==='T20'||M.league?6:10,death=I.maxOv-(M.fmt==='ODI'?9:4);
  const order=['ppAtt','pp',style==='S'?'midSpin':'mid','death'];
  let i=over<=pp?1:over>=death?3:2;
  if(att==null)att=I.target&&I.target-I.runs>(I.maxOv*6-I.lb)*1.6?1:0;
  i=clamp(i-att,0,3);return{key:order[i],over,style};
}
// ---------- the balls of an innings, live or from the log ----------
function inningsBalls(E,M,k){
  if(M&&M.inns[k])return M.inns[k].balls.map(b=>({...b,inn:k+1}));
  const L=S.logs[E.id]&&S.logs[E.id][k];if(!L)return null;
  return L.map(r=>{const t=parseToken(r[5]),how=r[10],dead=!!how||!!r[11]||t.w;
    return{inn:k+1,over:r[0],legal:r[1],card:r[2],roll:r[3],col:r[4],tok:r[5],st:r[6],bowler:r[7],w:how?1:0,how,bat:dead?0:t.bat,ex:dead?0:t.ex,exType:dead?'':t.exType};});
}
// ---------- drawing ----------
// From the striker (a little below the centre, at y0): `frac` of the way to the rope along the angle (frac > 1 clears it).
const STRIKER_Y=.2;
function fromBat(ang,frac,R){
  const a=ang*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),py=STRIKER_Y*R,pd=py*dy,t=-pd+Math.sqrt(pd*pd-(py*py-R*R));
  return[(dx*t*frac).toFixed(1),(py+dy*t*frac).toFixed(1)];
}
function groundSVG(inner,R=110){
  return`<svg viewBox="${-R-14} ${-R-14} ${2*R+28} ${2*R+28}" class="ground" role="img">
    <circle r="${R}" class="g-out"/><circle r="${R*.45}" class="g-in"/><rect x="-5" y="-${R*.22}" width="10" height="${R*.44}" class="g-pitch"/>
    <text x="0" y="${-R-4}" class="g-lab" text-anchor="middle">bowler's end</text><text x="${R*.78}" y="${R*.92}" class="g-lab" text-anchor="middle">off</text><text x="${-R*.78}" y="${R*.92}" class="g-lab" text-anchor="middle">leg</text>
    ${inner}</svg>`;
}
const SHOT_COL={1:'#7dd3fc',2:'#38bdf8',3:'#0ea5e9',4:'#facc15',5:'#facc15',6:'#f472b6'};
function wagonHTML(balls,M,date){
  const shots=balls.map(b=>({b,s:shotOf(b,pAttr(b.bowler,date).style)})).filter(x=>x.s);
  const R=110,y0=R*STRIKER_Y;
  const lines=shots.map(({b,s})=>{const[x,y]=fromBat(s.ang,s.dist,R);return`<line x1="0" y1="${y0}" x2="${x}" y2="${y}" stroke="${SHOT_COL[b.bat]}" stroke-width="${b.bat>=4?1.8:1.1}" opacity=".85"/>`;}).join('');
  const off=shots.filter(x=>OFF_ZONES.has(x.s.zone)).reduce((a,x)=>a+x.b.bat,0),tot=shots.reduce((a,x)=>a+x.b.bat,0);
  const n=k=>shots.filter(x=>x.b.bat===k).length;
  return`${groundSVG(lines,R)}<div class="muted" style="font-size:12px;text-align:center">${tot} runs · off side ${off}, leg side ${tot-off} · ${n(4)}×4 ${n(6)}×6 <span style="color:${SHOT_COL[1]}">●</span>1-3 <span style="color:${SHOT_COL[4]}">●</span>4 <span style="color:${SHOT_COL[6]}">●</span>6</div>`;
}
function pitchMapHTML(balls,date){
  const W=120,H=260,top=10,m2y=len=>H-14-len/13*(H-34);   // stumps at the bottom, 13m up the pitch
  const dots=balls.filter(b=>!(b.exType==='nb'&&!b.bat)).map(b=>{const p=pitchOf(b,pAttr(b.bowler,date).style),x=W/2+p.line*44,y=m2y(p.len);
    const c=b.w?'#ef4444':b.bat>=4?'#facc15':b.bat>0?'#38bdf8':b.exType==='wd'?'#a78bfa':'#94a3b8';
    return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${b.w?4.2:2.6}" fill="${c}" opacity="${b.w?1:.8}"/>`;}).join('');
  const band=(a,b,lab)=>`<rect x="14" y="${m2y(b)}" width="${W-28}" height="${m2y(a)-m2y(b)}" class="pm-band"/><text x="${W-16}" y="${(m2y(a)+m2y(b))/2+3}" class="g-lab" text-anchor="end">${lab}</text>`;
  return`<svg viewBox="0 0 ${W} ${H}" class="pitchmap" role="img"><rect x="14" y="${top}" width="${W-28}" height="${H-top-6}" class="g-pitch"/>
    ${band(0,2,'yorker')}${band(6,8,'good')}${band(10,13,'short')}
    <rect x="${W/2-5}" y="${H-12}" width="10" height="6" fill="#e2e8f0"/>${dots}</svg>
    <div class="muted" style="font-size:12px;text-align:center"><span style="color:#ef4444">●</span> wicket <span style="color:#facc15">●</span> boundary <span style="color:#38bdf8">●</span> runs <span style="color:#94a3b8">●</span> dot</div>`;
}
function fieldHTML(M){
  const F=fieldFor(M);if(!F)return'';
  const[name,list]=FIELDS[F.key],R=110;
  const dots=list.map(k=>{const[a,r,lab]=FPOS[k],[x,y]=fromBat(a,r,R);return`<g><circle cx="${x}" cy="${y}" r="4.5" class="f-man"><title>${lab}</title></circle><text x="${x}" y="${+y-7}" class="f-lab" text-anchor="middle">${lab}</text></g>`;}).join('');
  const[bx,by]=fromBat(0,.42,R),[kx,ky]=fromBat(180,.3,R);
  return`${groundSVG(`${dots}<circle cx="${bx}" cy="${by}" r="4.5" class="f-bowl"><title>Bowler</title></circle><circle cx="${kx}" cy="${ky}" r="4.5" class="f-keep"><title>Keeper</title></circle>`,R)}
    <div class="muted" style="font-size:12px;text-align:center">${esc(name)}${M.manualCaptain?.[curInn(M).bowl]?' · your Field setting':''}</div>`;
}
let FIELD_SEL={inn:-1,bat:0,bowl:0};
function fieldTabHTML(E,M){
  const n=E.inns.length,k=FIELD_SEL.inn<0||FIELD_SEL.inn>=n?n-1:FIELD_SEL.inn;
  const balls=k>=0?inningsBalls(E,M,k):null,date=E.date;
  if(!balls)return`<div class="muted">${k<0?'No balls yet.':`Shot and pitch maps are kept for the last ${LOG_KEEP} matches.`}</div>`;
  const bats=[...new Set(balls.map(b=>b.st))],bowls=[...new Set(balls.map(b=>b.bowler))];
  const bf=bats.includes(FIELD_SEL.bat)?FIELD_SEL.bat:0,wf=bowls.includes(FIELD_SEL.bowl)?FIELD_SEL.bowl:0;
  const I=E.inns[k];
  return`<div class="row" style="margin-bottom:10px"><select id="fs-inn">${E.inns.map((x,i)=>`<option value="${i}" ${i===k?'selected':''}>${esc(teamShort(x.bat))} - ${ordinal(i+1)} innings</option>`).join('')}</select></div>
  <div class="grid g3 field-grid" style="align-items:start">
    ${M&&M.state==='live'?`<div><h3>Field</h3>${fieldHTML(M)}</div>`:''}
    <div><h3>Wagon wheel</h3><select id="fs-bat" style="margin-bottom:6px"><option value="0">All ${esc(teamShort(I.bat))} batters</option>${bats.map(p=>`<option value="${p}" ${p===bf?'selected':''}>${esc(pName(p))}</option>`).join('')}</select>
      ${wagonHTML(balls.filter(b=>!bf||b.st===bf),M,date)}</div>
    <div><h3>Pitch map</h3><select id="fs-bowl" style="margin-bottom:6px"><option value="0">All ${esc(teamShort(I.bowl))} bowlers</option>${bowls.map(p=>`<option value="${p}" ${p===wf?'selected':''}>${esc(pName(p))}</option>`).join('')}</select>
      ${pitchMapHTML(balls.filter(b=>!wf||b.bowler===wf),date)}</div></div>`;
}
function wireFieldTab(E,M,el){
  const re=()=>{el.innerHTML=fieldTabHTML(E,M);wireFieldTab(E,M,el);},q=s=>el.querySelector(s);
  q('#fs-inn')&&(q('#fs-inn').onchange=e=>{FIELD_SEL={inn:+e.target.value,bat:0,bowl:0};re();});
  q('#fs-bat')&&(q('#fs-bat').onchange=e=>{FIELD_SEL.bat=+e.target.value;re();});
  q('#fs-bowl')&&(q('#fs-bowl').onchange=e=>{FIELD_SEL.bowl=+e.target.value;re();});
}
