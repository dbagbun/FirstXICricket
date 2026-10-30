// ═══ UTILITIES ═══
'use strict';
const rnd=()=>Math.random();
// Formats: ODI, Test, T20. perFmt(f) builds {ODI:f(),TEST:f(),T20:f()}.
// LEAGUE = franchise T20s: played as T20s, kept apart in the stats, records and rankings.
const FORMATS=['ODI','TEST','T20','LEAGUE'],FMT_NAME={ODI:'ODI',TEST:'Test',T20:'T20',LEAGUE:'League'},FMT_PLURAL={ODI:'ODIs',TEST:'Tests',T20:'T20s',LEAGUE:'League'};
const INTL=['ODI','TEST','T20'];   // what you can schedule or build; LEAGUE only comes from the franchise league
const perFmt=f=>Object.fromEntries(FORMATS.map(k=>[k,f(k)]));
const roll100=()=>Math.floor(rnd()*100)+1;
const rndInt=(a,b)=>Math.floor(rnd()*(b-a+1))+a;
const pick=a=>a[Math.floor(rnd()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sum=a=>a.reduce((x,y)=>x+y,0);
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oversTxt=b=>Math.floor(b/6)+(b%6?'.'+(b%6):'');
const oversDec=b=>b/6;
const f1=v=>isFinite(v)?v.toFixed(1):'-';
const f2=v=>isFinite(v)?v.toFixed(2):'-';
const plural=(n,w,many)=>n+' '+(n===1?w:many||w+'s');
const ordinal=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:n%10]||'th');
const fmtDate=d=>{if(!d)return'';const[y,m,dd]=d.split('-');return +dd+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y;};
const daysBetween=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const addDays=(d,n)=>new Date(Date.parse(d)+n*864e5).toISOString().slice(0,10);

function toast(html,cls=''){
  const t=document.createElement('div');t.className='toast '+cls;t.innerHTML=html;
  const box=$('#toasts');box.appendChild(t);
  while(box.children.length>4)box.firstChild.remove();
  setTimeout(()=>t.classList.add('out'),4200);setTimeout(()=>t.remove(),4800);
}

// Saves are compressed: LZW over the UTF-8 bytes, codes packed 15 bits to a character
// (always below the surrogate range). "LZ1:<codes>:<data>"; anything else is plain JSON.
const LZ_TAG='LZ1:',LZ_MAX=1<<22;
const lzW=k=>32-Math.clz32(Math.min(LZ_MAX,256+k));
function lzPack(str){
  const s=unescape(encodeURIComponent(str)),dict=new Map(),out=[];
  let next=256,w=-1,k=0,acc=0,nb=0;
  const emit=code=>{const W=lzW(k++);acc=acc*2**W+code;nb+=W;
    while(nb>=15){const sh=2**(nb-15),hi=Math.floor(acc/sh);out.push(String.fromCharCode(hi+32));acc-=hi*sh;nb-=15;}};
  for(let i=0;i<s.length;i++){
    const c=s.charCodeAt(i);if(w<0){w=c;continue;}
    const key=w*256+c,nx=dict.get(key);
    if(nx!==undefined){w=nx;continue;}
    emit(w);if(next<LZ_MAX)dict.set(key,next++);w=c;
  }
  if(w>=0)emit(w);
  if(nb)out.push(String.fromCharCode(acc*2**(15-nb)+32));
  return LZ_TAG+k+':'+out.join('');
}
function lzUnpack(z){
  const i=z.indexOf(':',LZ_TAG.length),n=+z.slice(LZ_TAG.length,i),dict=[],out=[];
  for(let c=0;c<256;c++)dict.push(String.fromCharCode(c));
  let p=i+1,acc=0,nb=0,prev=null;
  for(let k=0;k<n;k++){
    const W=lzW(k);
    while(nb<W){acc=acc*32768+(z.charCodeAt(p++)-32);nb+=15;}
    const sh=2**(nb-W),code=Math.floor(acc/sh);acc-=code*sh;nb-=W;
    const e=code<dict.length?dict[code]:code===dict.length&&prev!=null?prev+prev[0]:null;
    if(e==null)throw new Error('bad save data');
    out.push(e);if(prev!=null&&dict.length<LZ_MAX)dict.push(prev+e[0]);prev=e;
  }
  return decodeURIComponent(escape(out.join('')));
}
const saveText=raw=>raw&&raw.startsWith(LZ_TAG)?lzUnpack(raw):raw;
