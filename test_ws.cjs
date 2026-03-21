const WebSocket = require('ws');

const token = '9981da789c34db63b5ef1529d964c6a344b1eb592d067caa';
const url = 'ws://127.0.0.1:18789/?token=' + token;

const p = { 
    type: "req", id: "1", method: "connect", 
    params: { 
        minProtocol: 1, maxProtocol: 10, auth: { token: token }, 
        client: { id: "cli", version: "1.0.0", platform: "windows", mode: "webchat" } 
    }
};

console.log(`\n>>> TESTANDO PAYLOAD WEBCHAT:`, JSON.stringify(p));
const ws = new WebSocket(url);
let resolved = false;

ws.on('open', () => ws.send(JSON.stringify(p)));

ws.on('message', (d) => {
    const str = d.toString();
    console.log(`   [MSG] Recebeu: ${str}`);
    if (str.includes('"error"') || str.includes('1008') || str.includes('INVALID_REQUEST')) {
        if(!resolved) { resolved = true; ws.close(); }
    } else if (str.includes('"res"') && str.includes('"ok":true')) {
        console.log(`\n\n🎉 ACHAMOS O PAR ESTÁVEL!!! 🎉`);
        process.exit(0);
    }
});

ws.on('close', (c, r) => {
    if(resolved) return; 
    resolved = true;
    console.log("DROP:", c, r);
});

ws.on('error', (e) => {
    if(resolved) return; 
    resolved = true;
    console.log("ERR:", e.message);
});

setTimeout(() => {
    if (!resolved && ws.readyState === WebSocket.OPEN) {
        console.log(`\n\n🎉 CONEXÃO SOBREVIVEU O TEMPO MÁXIMO!!! 🎉`);
        process.exit(0);
    }
}, 3000);
