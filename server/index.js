import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Para as requisições à IA
import { NpcBrainOpenclawGateway } from './NpcBrainOpenclawGateway.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const players = {};
const roomData = {}; // Stores { tvUrl: string } per room

let npcState = {
    pos: { x: 5, y: 0, z: -5 },
    rot: 0,
    commands: { forward: false, backward: false, left: false, right: false, jump: false } // Ações atuais
};

// Global Array to hold OpenClaw Logs securely across Rooms. (We'll mostly keep them broadcasted live, but buffering 100 for newly joined clients)
const openClawLogs = [];

// === NPC AI Brain (Antiga OpenAI, Agora Desabilitada em Favor do OpenClaw) ===
let isProcessingBrain = false;

async function runNPCBrain() {
    try {
        npcState.status = "Planejando...";
        io.emit('npc_status', npcState.status);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify({
                model: "google/gemma-3n-e2b-it:free",
                messages: [
                    {
                        role: "system",
                        content: "Você é o cérebro de um NPC em um quarto cozy. Responda APENAS com um JSON contendo 10 movimentos. " +
                            "Formato: {\"actions\": [{\"forward\":bool, \"backward\":bool, \"left\":bool, \"right\":bool, \"jump\":bool, \"duration\":ms}, ...]}"
                    },
                    { role: "user", content: "Gere 10 movimentos." }
                ]
            })
        });

        const data = await response.json();
        console.log("NPC Brain API Response received");
        
        if (!response.ok || !data.choices || !data.choices[0]) {
            console.error("Erro na resposta da API do NPC:", data);
            npcState.status = "Ocioso (Erro na API)";
            io.emit('npc_status', npcState.status);
            setTimeout(runNPCBrain, 15000); // Retry later
            return;
        }

        const reply = data.choices[0].message.content.trim();
        const jsonMatch = reply.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            const actions = result.actions;
            console.log(`NPC executando ${actions.length} ações`);

            for (let i = 0; i < actions.length; i++) {
                npcState.commands = actions[i];
                npcState.status = `Movendo (${i + 1}/10)`;
                io.emit('npc_update', npcState);

                await new Promise(r => setTimeout(r, actions[i].duration || 1000));

                npcState.commands = { forward: false, backward: false, left: false, right: false, jump: false };
                io.emit('npc_update', npcState);
                await new Promise(r => setTimeout(r, 200));
            }
        }
    } catch (e) {
        console.error("Erro NPC Server:", e);
        npcState.status = "Erro de Rede";
    } finally {
        npcState.status = "Ocioso";
        io.emit('npc_status', npcState.status);
        // setTimeout(runNPCBrain, 10000); // DESABILITADO TEMPORARIAMENTE
    }
}

// (Removido daqui e movido para dentro do server.listen)

// Inicializando o Gateway do OpenClaw!
// Conectamos passivamente à porta do OpenClaw (localhost:18789). Quando o OpenClaw "acorda"
// a gente arrasta o NPC (npcState) para as coordenadas da cadeira do PC e envia os logs para o frontend.
const gateway = new NpcBrainOpenclawGateway({
    onTaskStart: (msg) => {
        const taskInfo = msg.task || msg.message || 'Nova Tarefa no OpenClaw';
        console.log(`🤖 OpenClaw NPC Iniciando Tarefa:`, taskInfo);
        
        // Envia comando para o NPC caminhar até a cadeira
        npcState.status = "Operando Computador";
        io.emit('npc_status', npcState.status);
        io.emit('npc_target', { x: -4.8, z: -2.0 });

        const logMsg = { time: new Date().toLocaleTimeString(), text: `🚀 TAREFA INICIADA: ${taskInfo}` };
        openClawLogs.push(logMsg);
        if(openClawLogs.length > 50) openClawLogs.shift();
        io.emit('openclaw_log', logMsg);
    },
    onTaskLog: (msg) => {
        const content = msg.message || msg.output || msg.tool || msg.text || JSON.stringify(msg);
        console.log(`📜 OpenClaw NPC Log:`, content);
        
        if (npcState.status !== "Operando Computador") {
             npcState.status = "Operando Computador";
             io.emit('npc_status', npcState.status);
             io.emit('npc_target', { x: -4.8, z: -2.0 });
        }
        
        const logMsg = { time: new Date().toLocaleTimeString(), text: content };
        openClawLogs.push(logMsg);
        if(openClawLogs.length > 50) openClawLogs.shift(); // Keep only last 50
        io.emit('openclaw_log', logMsg);
    },
    onTaskEnd: (msg) => {
        console.log(`🏁 OpenClaw NPC Terminou Tarefa`);
        npcState.status = "Tarefa Finalizada";
        io.emit('npc_status', npcState.status);
        
        const logMsg = { time: new Date().toLocaleTimeString(), text: `✅ TAREFA FINALIZADA.` };
        openClawLogs.push(logMsg);
        if(openClawLogs.length > 50) openClawLogs.shift();
        io.emit('openclaw_log', logMsg);

        // O NPC pode levantar ou apenas aguardar a próxima.
    }
});

io.on('connection', (socket) => {
    socket.on('join', (userData) => {
        const room = userData.room || 'public';
        socket.join(room);
        
        players[socket.id] = {
            id: socket.id,
            name: userData.name || "Anon",
            skin: userData.skin, // Novo: Armazena a cor da skin
            room: room,
            pos: { x: 0, y: 0, z: 0 },
            rot: 0
        };
        
        const roomPlayers = {};
        for(let id in players) {
            if(players[id].room === room) roomPlayers[id] = players[id];
        }
        
        socket.emit('init_state', { 
            players: roomPlayers, 
            npcState,
            tvUrl: roomData[room] ? roomData[room].tvUrl : '',
            tvStartTime: roomData[room] ? roomData[room].tvStartTime : null,
            tvQueue: roomData[room] ? (roomData[room].tvQueue || []) : [],
            openClawLogs: openClawLogs // Dá a visão de log atual pra quem acaba de entrar!
        });
        socket.to(room).emit('player_joined', players[socket.id]);
    });

    socket.on('move', (moveData) => {
        if (players[socket.id]) {
            players[socket.id].pos = moveData.pos;
            players[socket.id].rot = moveData.rot;
            socket.to(players[socket.id].room).emit('player_moved', players[socket.id]);
        }
    });

    socket.on('change_room', (data) => {
        if (!players[socket.id]) return;
        const oldRoom = players[socket.id].room;
        const newRoom = data.room || 'public';
        
        socket.leave(oldRoom);
        io.to(oldRoom).emit('player_left', socket.id);
        
        players[socket.id].room = newRoom;
        socket.join(newRoom);
        
        const roomPlayers = {};
        for(let id in players) {
            if(players[id].room === newRoom) roomPlayers[id] = players[id];
        }
        
        socket.emit('init_state', { 
            players: roomPlayers, 
            npcState,
            tvUrl: roomData[newRoom] ? roomData[newRoom].tvUrl : '',
            tvStartTime: roomData[newRoom] ? roomData[newRoom].tvStartTime : null,
            tvQueue: roomData[newRoom] ? (roomData[newRoom].tvQueue || []) : [],
            openClawLogs: openClawLogs
        });
        socket.to(newRoom).emit('player_joined', players[socket.id]);
    });

    socket.on('change_video', (url) => {
        if (!players[socket.id]) return;
        const room = players[socket.id].room;
        if (!roomData[room]) roomData[room] = { tvQueue: [] };
        roomData[room].tvUrl = url;
        roomData[room].tvStartTime = Date.now();
        io.to(room).emit('change_video', { url, tvStartTime: roomData[room].tvStartTime });
    });

    socket.on('tv_add_queue', (url) => {
        if (!players[socket.id]) return;
        const room = players[socket.id].room;
        if (!roomData[room]) roomData[room] = { tvQueue: [] };
        if (!roomData[room].tvQueue) roomData[room].tvQueue = [];
        
        roomData[room].tvQueue.push(url);
        io.to(room).emit('tv_queue_update', roomData[room].tvQueue);

        // Se a TV estava vazia, toca isso agora mesmo
        if (!roomData[room].tvUrl) {
            roomData[room].tvUrl = url;
            roomData[room].tvStartTime = Date.now();
            io.to(room).emit('change_video', { url, tvStartTime: roomData[room].tvStartTime });
        }
    });

    socket.on('tv_skip', () => {
        if (!players[socket.id]) return;
        const room = players[socket.id].room;
        if (roomData[room] && roomData[room].tvQueue && roomData[room].tvQueue.length > 0) {
            const finishedUrl = roomData[room].tvQueue.shift(); // Remove a que terminou/foi pulada
            io.to(room).emit('tv_queue_update', roomData[room].tvQueue);
            
            if (roomData[room].tvQueue.length > 0) {
                // Toca a próxima
                const nextUrl = roomData[room].tvQueue[0];
                roomData[room].tvUrl = nextUrl;
                roomData[room].tvStartTime = Date.now();
                io.to(room).emit('change_video', { url: nextUrl, tvStartTime: roomData[room].tvStartTime });
            } else {
                // Fila acabou
                roomData[room].tvUrl = '';
                roomData[room].tvStartTime = null;
                io.to(room).emit('change_video', null); // frontend will clear the iframe or stop 
            }
        }
    });

    socket.on('chat_message', (msg) => {
        if (players[socket.id]) {
            io.to(players[socket.id].room).emit('chat_message', msg);
        }
    });

    socket.on('disconnect', () => {
        const p = players[socket.id];
        if (p) {
            io.to(p.room).emit('player_left', socket.id);
            delete players[socket.id];
        }
    });

    // --- WEBRTC SIGNALING ---
    socket.on('webrtc_offer', (data) => {
        io.to(data.target).emit('webrtc_offer', { sender: socket.id, sdp: data.sdp });
    });

    socket.on('webrtc_answer', (data) => {
        io.to(data.target).emit('webrtc_answer', { sender: socket.id, sdp: data.sdp });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        io.to(data.target).emit('webrtc_ice_candidate', { sender: socket.id, candidate: data.candidate });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Inicia o cérebro apenas após o servidor estar online
    // runNPCBrain(); // DESABILITADO TEMPORARIAMENTE
});

app.get('/status', (req, res) => {
    res.json({ status: "online", players: Object.keys(players).length, npc: npcState.status });
});
