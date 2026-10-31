// ═══ SAVE STORAGE — IndexedDB with the browser's own gzip; localStorage as the fallback ═══
// localStorage caps an origin at ~5MB and the old LZW packing took seconds on a long career. Where the browser has
// IndexedDB and CompressionStream, each save is gzipped JSON in IDB ('first-xi' / 'saves'), mirrored in memory
// (STORE.cache: key -> JSON text) so reads stay synchronous; writes go in the background, latest wins. Old
// localStorage saves move across on the first start. Slot summaries (fxi_save_N_meta) stay in localStorage.
const STORE={db:null,cache:new Map(),ok:false,queue:new Map(),busy:false};
function idbSupported(){try{return typeof indexedDB!=='undefined'&&!!indexedDB&&typeof CompressionStream!=='undefined'&&typeof DecompressionStream!=='undefined';}catch(e){return false;}}
const idbReq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
async function gz(text){return await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();}
async function gunz(buf){return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
const storeOS=mode=>STORE.db.transaction('saves',mode).objectStore('saves');
async function storePut(k,text){const buf=await gz(text);await idbReq(storeOS('readwrite').put(buf,k));}
// Open the database, load every save into memory, move old localStorage saves across. Resolves true when IDB is in use.
async function storeInit(){
  if(!idbSupported())return false;
  try{
    const open=indexedDB.open('first-xi',1);open.onupgradeneeded=()=>open.result.createObjectStore('saves');
    STORE.db=await Promise.race([idbReq(open),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),4000))]);
    const keys=await idbReq(storeOS('readonly').getAllKeys());
    for(const k of keys){const v=await idbReq(storeOS('readonly').get(k));STORE.cache.set(k,typeof v==='string'?v:await gunz(v));}
    for(const k of[...SLOT_KEYS,SANDBOX_KEY]){
      let raw=null;try{raw=localStorage.getItem(k);}catch(e){}
      if(!raw)continue;
      if(!STORE.cache.has(k)){const text=saveText(raw);STORE.cache.set(k,text);await storePut(k,text);}
      try{localStorage.removeItem(k);}catch(e){}
    }
    STORE.ok=true;return true;
  }catch(e){STORE.ok=false;STORE.cache.clear();return false;}
}
// A background write; while one is in flight, later saves of the same key replace the queued text.
function storeWrite(k,text){
  STORE.cache.set(k,text);STORE.queue.set(k,text);
  if(STORE.busy)return;STORE.busy=true;
  (async()=>{
    try{while(STORE.queue.size){const[k2,t]=STORE.queue.entries().next().value;STORE.queue.delete(k2);await storePut(k2,t);}}
    catch(e){if(typeof toast==='function')toast("Couldn't save to this browser's storage - back up your career from Settings.",'bad');}
    finally{STORE.busy=false;}
  })();
}
// The JSON text of a save (either backend), or null.
function storeGet(k){
  if(STORE.ok)return STORE.cache.get(k)??null;
  try{const raw=localStorage.getItem(k);return raw?saveText(raw):null;}catch(e){return null;}
}
function storeHas(k){if(STORE.ok)return STORE.cache.has(k);try{return!!localStorage.getItem(k);}catch(e){return false;}}
function storeDel(k){
  if(STORE.ok){STORE.cache.delete(k);STORE.queue.delete(k);try{storeOS('readwrite').delete(k);}catch(e){}return;}
  try{localStorage.removeItem(k);}catch(e){}
}
// Resolves when nothing is waiting to be written (tests, and before leaving the page).
async function storeFlush(){for(let i=0;i<400&&(STORE.busy||STORE.queue.size);i++)await new Promise(r=>setTimeout(r,25));}
