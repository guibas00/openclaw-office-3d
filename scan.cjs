const fs = require('fs');
const txt = fs.readFileSync('openclaw_bundle.js', 'utf8');

console.log("Searching for 'connect'...");
let idx = txt.indexOf('connect"');
let matches = 0;

while(idx !== -1 && matches < 10) {
   let start = Math.max(0, idx - 100);
   let end = Math.min(txt.length, idx + 100);
   let ctx = txt.substring(start, end);
   
   // Apenas exibir se houver "platform" ou "version" ou algo suspeito de payload
   if(ctx.includes('version') || ctx.includes('platform') || ctx.includes('client') || ctx.includes('req')) {
       console.log('\n--- Match', matches, '---');
       console.log(ctx);
   }
   
   idx = txt.indexOf('connect"', idx + 1);
   matches++;
}
if(matches === 0) console.log('No matches found.');
console.log("Done!");
