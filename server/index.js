import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { env } from 'process';

dotenv.config();

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
    commands: { forward: false, backward: false, left: false, right: false, jump: false },
    status: "Ocioso"
};

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

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
            tvStartTime: roomData[room] ? roomData[room].tvStartTime : null
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
            tvStartTime: roomData[newRoom] ? roomData[newRoom].tvStartTime : null
        });
        socket.to(newRoom).emit('player_joined', players[socket.id]);
    });

    socket.on('change_video', (url) => {
        if (!players[socket.id]) return;
        const room = players[socket.id].room;
        if (!roomData[room]) roomData[room] = {};
        roomData[room].tvUrl = url;
        roomData[room].tvStartTime = Date.now();
        io.to(room).emit('change_video', { url, tvStartTime: roomData[room].tvStartTime });
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
