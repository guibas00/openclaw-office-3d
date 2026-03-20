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

        if (!data.choices || !data.choices[0]) {
            console.error("Erro na resposta da API:", data);
            throw new Error("Resposta da API inválida");
        }

        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);

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
        setTimeout(runNPCBrain, 10000);
    }
}

// (Removido daqui e movido para dentro do server.listen)

io.on('connection', (socket) => {
    socket.on('join', (userData) => {
        players[socket.id] = {
            id: socket.id,
            name: userData.name || "Anon",
            skin: userData.skin, // Novo: Armazena a cor da skin
            pos: { x: 0, y: 0, z: 0 },
            rot: 0
        };
        socket.emit('init_state', { players, npcState });
        socket.broadcast.emit('player_joined', players[socket.id]);
    });

    socket.on('move', (moveData) => {
        if (players[socket.id]) {
            players[socket.id].pos = moveData.pos;
            players[socket.id].rot = moveData.rot;
            socket.broadcast.emit('player_moved', players[socket.id]);
        }
    });

    socket.on('chat_message', (msg) => {
        io.emit('chat_message', msg);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('player_left', socket.id);
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
    runNPCBrain();
});

app.get('/status', (req, res) => {
    res.json({ status: "online", players: Object.keys(players).length, npc: npcState.status });
});
