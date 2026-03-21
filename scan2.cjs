const fs = require('fs');
const txt = fs.readFileSync('openclaw_bundle.js', 'utf8');

console.log("Searching for 'client:'...");
let idx = txt.indexOf('client:');
let matches = 0;

while(idx !== -1 && matches < 20) {
   let start = Math.max(0, idx - 50);
   let end = Math.min(txt.length, idx + 100);
   let ctx = txt.substring(start, end);
   
   if(ctx.includes('version') || ctx.includes('platform') || ctx.includes('id') || ctx.includes('{')) {
       console.log('\n--- Match', matches, '---');
       console.log(ctx);
   }
   
   idx = txt.indexOf('client:', idx + 1);
   matches++;
}
if(matches === 0) console.log('No matches found.');
console.log("Done!");
