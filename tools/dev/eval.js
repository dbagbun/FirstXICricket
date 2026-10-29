// Dev helper: evaluate an expression inside the built game (no career loaded). node tools/dev/eval.js dist/first-xi.html '<expr>'
const {JSDOM}=require('jsdom'),fs=require('fs');
const w=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{runScripts:'dangerously',url:'http://localhost/',beforeParse(w){w.FXI_NO_INIT=true;w.scrollTo=()=>{};}}).window;
console.log(w.eval(process.argv[3]));
