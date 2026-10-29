// Deterministic runs: FXI_SEED=42 node -r ./tests/seed.js tests/e2eN.js ...
// Gives every jsdom window a seeded Math.random (mulberry32). Without FXI_SEED it does nothing.
const seed=process.env.FXI_SEED;
if(seed!=null&&seed!==''){
  const jsdom=require('jsdom'),Base=jsdom.JSDOM;
  const mulberry32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  let n=0;
  jsdom.JSDOM=class extends Base{
    constructor(html,opts={}){
      const bp=opts.beforeParse,s=(parseInt(seed,10)||0)+(n++)*7919;
      super(html,{...opts,beforeParse(w){w.Math.random=mulberry32(s);if(bp)bp(w);}});
    }
  };
}
