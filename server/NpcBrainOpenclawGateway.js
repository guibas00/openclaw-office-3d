import WebSocket from 'ws';

export class NpcBrainOpenclawGateway {
    constructor(callbacks) {
        this.ws = null;
        this.onTaskStart = callbacks.onTaskStart || (() => { });
        this.onTaskLog = callbacks.onTaskLog || (() => { });
        this.onTaskEnd = callbacks.onTaskEnd || (() => { });
        // OpenClaw usa parâmetros de interrogação (Query String) para validar o Token em Websockets puros
        this.gatewayUrl = 'ws://127.0.0.1:18789/?token=9981da789c34db63b5ef1529d964c6a344b1eb592d067caa';

        this.connect();
    }

    connect() {
        console.log(`📡 OpenClaw: Tentando conexão local em ${this.gatewayUrl}...`); // Para contornar a Política de Origem Estrita (CORS/CSRF) do OpenClaw, forjamos a UI do localhost
        this.ws = new WebSocket(this.gatewayUrl, {
            headers: {
                'Origin': 'http://127.0.0.1:18789'
            }
        });

        this.ws.on('open', () => {
            console.log('✅ OpenClaw: Socket TCP Estabelecido! Enviando Handshake de Autenticação...');
            
            const tokenMatch = this.gatewayUrl.match(/token=([^&]+)/);
            const token = tokenMatch ? tokenMatch[1] : '';

            // OpenClaw usa JSON-RPC obrigatório formatado estritamente por TypeBox
            const handshake = {
                type: "req",
                id: "1",
                method: "connect",
                params: {
                    minProtocol: 3,
                    maxProtocol: 3,
                    auth: { token: token },
                    client: { 
                        id: "cli", 
                        version: "1.0.0", 
                        platform: "windows", 
                        mode: "webchat" 
                    }
                }
            };
            
            this.ws.send(JSON.stringify(handshake));
        });

        this.ws.on('message', (data) => {
            try {
                const textData = data.toString();
                const msg = JSON.parse(textData);
                
                // Muta floods de eventos internos e health checks contínuos do OpenClaw
                if (msg.event === 'health' || msg.event === 'state' || msg.event === 'connect.challenge' || msg.event === 'heartbeat' || msg.type === 'ping') {
                    return;
                }

                if (msg.type === 'error' || msg.error) {
                    console.log('🚨 OpenClaw Erro:', msg);
                }

                // Identifica se há texto real (mensagem de chat do Telegram, etc)
                // O OpenClaw pode encapsular a mensagem dentro de msg.payload
                let contentText = null;
                if (msg.message || msg.text || msg.output || msg.tool) {
                    contentText = msg.message || msg.text || msg.output || msg.tool;
                } else if (msg.payload) {
                    contentText = msg.payload.text || msg.payload.message || msg.payload.content || msg.payload.log;
                }

                const msgTypeStr = msg.type === 'event' ? msg.event : msg.type;
                
                // Loga no terminal de forma enxuta
                if (contentText) {
                    console.log(`📱 [OpenClaw -> ${msgTypeStr}]:`, contentText);
                }

                // Reconhecimento Flexível de Eventos
                const isTaskStart = msg.type === 'task_start' || msg.event === 'task_started' || msg.action === 'start' || (msg.task && !msg.status);
                const isTaskEnd = msg.type === 'task_complete' || msg.type === 'task_end' || msg.status === 'done' || msg.status === 'completed';
                // Se achou um "texto" de mensagem, trata como Log válido para a Tela 3D simulada
                const isLog = msg.type === 'log' || msg.event === 'step' || contentText;

                // Propaga os eventos processados para a Tela 3D simulada
                if (isTaskStart) {
                    this.onTaskStart(msg);
                } else if (isTaskEnd) {
                    this.onTaskEnd(msg);
                } else if (isLog) {
                    // Empacotamos o texto extraído para garantir que a tela 3D tenha algo para mostrar
                    msg.message = contentText || JSON.stringify(msg);
                    this.onTaskLog(msg);
                }

            } catch (e) {
                // Caso falhe o parse
            }
        });

        this.ws.on('error', (err) => {
            console.error('❌ OpenClaw Gateway WSA Error:', err.message);
        });

        this.ws.on('close', (code, reason) => {
            console.log(`🔌 OpenClaw: Conexão Fechada. CODE: ${code} - REASON: ${reason || 'Nenhum'}. Reconectando em 5s...`);
            setTimeout(() => this.connect(), 5000);
        });
    }
}
