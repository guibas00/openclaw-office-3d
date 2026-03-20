<template>
  <div ref="container" class="scene-container">
    <button v-if="isMobile && !showMobileMenu" @click="showMobileMenu = true" id="menu-toggle-btn">
      ☰ Menu
    </button>
    <div id="menu-overlay" v-if="isMobile && showMobileMenu" @click="showMobileMenu = false"></div>

    <div id="ui" v-show="!isMobile || showMobileMenu">
        <b>SISTEMA MULTIPLAYER</b><br>
        OLÁ, {{ playerName }} | WASD: Mover<br>
        <span id="status" style="color: yellow;">NPC: {{ npcLocalStatus }}</span><br>
        <button @click="toggleCamera" class="cam-btn">
          Câmera: {{ isFirstPerson ? '1ª Pessoa' : 'Isométrica' }} (V)
        </button>
        <button @click="toggleVoiceChat" class="cam-btn" :style="{ background: inVoiceChat ? '#aa4444' : '#44aa44', marginLeft: '5px' }">
          {{ inVoiceChat ? 'Sair da Voz' : 'Entrar na Voz' }}
        </button>
        <button v-if="inVoiceChat" @click="toggleVoiceMute" class="cam-btn" style="margin-left: 5px;">
          {{ isVoiceMuted ? 'Desmutar' : 'Mutar' }} (M)
        </button>
        <button v-if="isMobile" @click="showMobileChat = true" class="cam-btn" style="margin-left: 5px; background: #55aadd; color: #fff;">
          💬 Chat
        </button>
    </div>
    <div id="chat-container" v-show="!isMobile || showMobileChat" :class="{ 'mobile-active': isMobile }">
      <div class="chat-header" v-if="isMobile">
        <span>Bate-papo</span>
        <button @click="showMobileChat = false" class="chat-close-btn">X</button>
      </div>
      <div class="chat-messages" ref="chatMessagesRef">
        <div v-for="(msg, i) in chatMessages" :key="i" class="chat-message">
          <strong>{{ msg.name }}:</strong> {{ msg.text }}
        </div>
      </div>
      <input 
        type="text" 
        v-model="chatInput" 
        @keydown.enter="sendChatMessage" 
        @focus="isChatFocused = true" 
        @blur="isChatFocused = false" 
        placeholder="Escreva e de ENTER..." 
        class="chat-input"
        maxlength="100"
      />
    </div>

    <div id="mobile-controls" v-if="isMobile">
      <div id="joystick-wrapper">
        <div id="joystick-zone" ref="joystickZone"></div>
      </div>
      <div class="action-btn-container">
        <button @touchstart.prevent="keys[' ']=true" @touchend.prevent="keys[' ']=false" class="action-btn">PULAR</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { World } from '../js/World.js';
import { Player } from '../js/Player.js';
import { NPC } from '../js/NPC.js';
import { VoiceChat } from '../js/VoiceChat.js';
import nipplejs from 'nipplejs';

const props = defineProps(['playerName', 'playerSkin']); // Recebe a skin
const container = ref(null);
const npcLocalStatus = ref('Ocioso');

const chatMessages = ref([]);
const chatInput = ref('');
const isChatFocused = ref(false);
const chatMessagesRef = ref(null);
const isFirstPerson = ref(false);
const isMobile = ref(false);
const showMobileChat = ref(false);
const showMobileMenu = ref(false);
const isPortrait = ref(true);
const joystickZone = ref(null);

const inVoiceChat = ref(false);
const isVoiceMuted = ref(false);
let voiceChat = null;

function toggleVoiceChat() {
  if (!inVoiceChat.value) {
    voiceChat.joinVoiceChat().then(success => {
      if (success) {
        inVoiceChat.value = true;
        Object.keys(remotePlayers).forEach(id => {
          voiceChat.connectToPeer(id);
        });
      }
    });
  } else {
    voiceChat.leaveVoiceChat();
    inVoiceChat.value = false;
  }
}

function toggleVoiceMute() {
  if (voiceChat) {
    isVoiceMuted.value = voiceChat.toggleMute();
  }
}

let socket, scene, renderer, world, player, npc;
let isoCamera, fpCamera, activeCamera;
let remotePlayers = {};
const keys = {};

function toggleCamera() {
  isFirstPerson.value = !isFirstPerson.value;
  activeCamera = isFirstPerson.value ? fpCamera : isoCamera;
  if (player) {
    player.setFirstPerson(isFirstPerson.value);
  }
  if (world) {
    world.setFirstPersonMode(isFirstPerson.value);
  }
}

function sendChatMessage() {
  if (chatInput.value.trim() && socket) {
    socket.emit('chat_message', { name: props.playerName, text: chatInput.value.trim() });
    chatInput.value = '';
    if (isMobile.value) showMobileChat.value = false;
  }
}

onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  if (isMobile.value) {
    setTimeout(() => {
      if (joystickZone.value) {
        const manager = nipplejs.create({
          zone: joystickZone.value,
          mode: 'static',
          position: { left: '50%', top: '50%' },
          color: '#ddaa55',
          size: 120
        });

        manager.on('move', (evt, data) => {
          if (data && data.vector) {
            keys['w'] = data.vector.y > 0.3;
            keys['s'] = data.vector.y < -0.3;
            keys['a'] = data.vector.x < -0.3;
            keys['d'] = data.vector.x > 0.3;
          }
        });

        manager.on('end', () => {
          keys['w'] = false; keys['a'] = false; keys['s'] = false; keys['d'] = false;
        });
      }
    }, 500);
  }

  initThree();
  initSocket();
  animate();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});

onUnmounted(() => {
  if (socket) socket.disconnect();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

function initThree() {
  scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  const d = 5;
  isoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
  fpCamera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);

  activeCamera = isoCamera;
  activeCamera.position.set(10, 10, 10);
  activeCamera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: !isMobile.value });
  renderer.setPixelRatio(isMobile.value ? 1.0 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isMobile.value; // Desabilita mapa de sombras inteiro no celular
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.value.appendChild(renderer.domElement);

  // --- ILUMINAÇÃO WORKSHOP ---
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8ca3b5, 0.5); // Sky, Wall bounce (Slate Blue)
  hemiLight.position.set(0, 8, 0);
  scene.add(hemiLight);

  addYellowLight(-4, 4.5, -2, 1.2); // Desk 1 area
  addYellowLight(3.5, 4.5, -5, 1.2); // Desk 2 area
  addYellowLight(0, 4.5, 0, 1.0); // Center room

  world = new World(scene, activeCamera, () => {});
  
  // Debug: Verificar se as props estão chegando
  console.log("Scene Init - Player Name:", props.playerName);
  console.log("Scene Init - Player Skin:", props.playerSkin);

  player = new Player(scene, world, props.playerName, props.playerSkin);
  
  // Attach first person camera to the player naturally
  fpCamera.position.set(0, 1.6, 0.2); // Head height and slightly forward
  fpCamera.rotation.y = Math.PI; // Look forward (+Z is forward mapping in Player, rotate 180 deg to face it)
  player.group.add(fpCamera);

  npc = new NPC(scene, null, 'Assistant');
}

function addYellowLight(x, y, z, intensity) {
  const light = new THREE.PointLight(0xffaa22, intensity, 15);
  light.position.set(x, y, z);
  if (!isMobile.value) {
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
  }
  scene.add(light);
}

function initSocket() {
  socket = io();
  voiceChat = new VoiceChat(socket);

  socket.on('connect', () => {
    // Envia NOME e SKIN no join
    socket.emit('join', { name: props.playerName, skin: props.playerSkin });
  });

  socket.on('init_state', (state) => {
    Object.values(state.players).forEach(p => {
      if (p.id !== socket.id) addRemotePlayer(p);
    });
    updateNPC(state.npcState);
  });

  socket.on('player_joined', (p) => {
    if (p.id !== socket.id) {
      addRemotePlayer(p);
      if (inVoiceChat.value) {
        voiceChat.connectToPeer(p.id);
      }
    }
  });

  socket.on('player_moved', (p) => {
    if (remotePlayers[p.id]) {
      remotePlayers[p.id].group.position.set(p.pos.x, p.pos.y, p.pos.z);
      remotePlayers[p.id].group.rotation.y = p.rot;
      remotePlayers[p.id]._isMoving = true;
      clearTimeout(remotePlayers[p.id]._moveTimer);
      remotePlayers[p.id]._moveTimer = setTimeout(() => {
        if (remotePlayers[p.id]) remotePlayers[p.id]._isMoving = false;
      }, 100);
    }
  });

  socket.on('player_left', (id) => {
    if (remotePlayers[id]) {
      scene.remove(remotePlayers[id].group);
      delete remotePlayers[id];
    }
    if (voiceChat) {
      voiceChat.removePeer(id);
    }
  });

  socket.on('npc_update', (state) => {
    updateNPC(state);
  });

  socket.on('npc_status', (status) => {
    npcLocalStatus.value = status;
  });

  socket.on('chat_message', (msg) => {
    chatMessages.value.push(msg);
    if (chatMessages.value.length > 50) chatMessages.value.shift();
    setTimeout(() => {
      if (chatMessagesRef.value) {
        chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
      }
    }, 50);

    // Show Speech Bubble globally
    if (player && player.name === msg.name) {
      player.showChatBubble(msg.text);
    } else {
      const remote = Object.values(remotePlayers).find(p => p.name === msg.name);
      if (remote) remote.showChatBubble(msg.text);
    }
  });
}

function addRemotePlayer(p) {
  // Criamos uma instância de Player para os remotos também (para usar o _build com skin)
  // Mas sem adicionar ao loop de update do teclado
  const remote = new Player(scene, world, p.name, p.skin);
  remote.group.position.set(p.pos.x, p.pos.y, p.pos.z);
  remote.group.rotation.y = p.rot;
  remote._isMoving = false;
  remotePlayers[p.id] = remote;
}

function updateNPC(state) {
  npc.group.position.set(state.pos.x, state.pos.y, state.pos.z);
  npc.group.rotation.y = state.rot;
  npc.currentCommands = state.commands;
}

function onKeyDown(e) { 
  if (isChatFocused.value) return; 
  if (e.key.toLowerCase() === 'v') {
    toggleCamera();
    return;
  }
  if (e.key.toLowerCase() === 'm') {
    if (inVoiceChat.value) toggleVoiceMute();
    return;
  }
  keys[e.key.toLowerCase()] = true; 
}
function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (player) {
    player.update(delta, keys, world.obstacles);
    socket.emit('move', {
      pos: player.group.position,
      rot: player.group.rotation.y
    });

    if (!isFirstPerson.value) {
      const targetPos = player.group.position.clone().add(new THREE.Vector3(10, 10, 10));
      isoCamera.position.lerp(targetPos, 0.05);
      isoCamera.lookAt(player.group.position);
    }
  }

  Object.values(remotePlayers).forEach(remote => {
    remote.update(delta, {}, world.obstacles, remote._isMoving);
  });

  if (npc && npc.currentCommands) {
    npc.update(delta, npc.currentCommands, world.obstacles);
  }

  renderer.render(scene, activeCamera);
}
</script>

<style scoped>
.scene-container { width: 100%; height: 100%; }
#ui { 
    position: absolute; top: 20px; left: 20px; color: #ddaa55; 
    background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px; border: 1px solid #555; 
    pointer-events: auto; z-index: 100;
}
#menu-toggle-btn {
  position: absolute; top: 20px; left: 20px; z-index: 90;
  background: rgba(0,0,0,0.8); color: #ddaa55; border: 1px solid #555;
  padding: 10px 15px; border-radius: 8px; font-weight: bold; font-family: 'Inter', sans-serif;
  cursor: pointer;
}
#menu-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 95;
}
.cam-btn {
  margin-top: 10px; background: #ddaa55; color: #000; border: none; padding: 6px 10px;
  cursor: pointer; border-radius: 4px; font-weight: bold; font-family: 'Inter', sans-serif;
}
.cam-btn:hover { background: #ffcc00; }

#chat-container {
  position: absolute; bottom: 20px; left: 20px; width: 350px; max-height: 250px;
  background: rgba(15, 15, 15, 0.8); border: 1px solid #ddaa55; border-radius: 8px;
  display: flex; flex-direction: column; z-index: 10; font-family: 'Inter', sans-serif;
}
.chat-messages {
  flex: 1; overflow-y: auto; padding: 12px; color: #fff; font-size: 14px;
  display: flex; flex-direction: column; gap: 6px; text-align: left;
}
.chat-message { word-wrap: break-word; text-shadow: 1px 1px 2px #000; }
.chat-message strong { color: #ddaa55; }
.chat-input {
  background: rgba(0, 0, 0, 0.9); border: none; border-top: 1px solid #444; color: #fff;
  padding: 12px; font-family: 'Inter', sans-serif; outline: none; border-radius: 0 0 8px 8px;
  transition: background 0.2s;
}
.chat-input:focus { background: rgba(30, 30, 30, 0.9); }
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-thumb { background: #ddaa55; border-radius: 3px; }

/* Mobile Chat Modal */
#chat-container.mobile-active {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 90% !important;
  height: 60% !important;
  max-width: 400px;
  max-height: 400px;
  z-index: 9999 !important;
  background: rgba(15, 15, 15, 0.95) !important;
  border: 2px solid #55aadd !important;
}
.chat-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px; border-bottom: 1px solid #444; color: #fff; font-weight: bold;
}
.chat-close-btn {
  background: transparent; color: #ffaa55; border: 1px solid #ffaa55; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-family: 'Inter', sans-serif;
}

#mobile-controls {
  position: absolute; bottom: 20px; right: 20px; width: calc(100% - 400px); 
  display: flex; justify-content: space-between; align-items: flex-end;
  pointer-events: none; z-index: 20;
}
#joystick-wrapper { width: 140px; height: 140px; position: relative; pointer-events: auto; }
#joystick-zone { width: 100%; height: 100%; position: absolute; pointer-events: auto; }

.action-btn-container { pointer-events: auto; }
.action-btn { 
  background: rgba(221, 170, 85, 0.6); border: 2px solid #ddaa55; color: #000;
  font-weight: bold; font-size: 18px; user-select: none; touch-action: none;
  width: 80px; height: 80px; border-radius: 40px; 
}
.action-btn:active { background: rgba(255, 204, 0, 0.9); }

@media (max-width: 768px) and (orientation: portrait) {
  #ui { transform: none; width: calc(100% - 40px); left: 20px; top: 20px; font-size: 13px; max-width: none; }
  .cam-btn { margin-top: 5px; margin-right: 5px; display: inline-block; font-size: 12px; }
  
  #chat-container { 
    top: 180px; left: 20px; width: calc(100% - 40px); height: 140px; bottom: auto; 
  }
  
  #mobile-controls { width: calc(100% - 60px); left: 30px; bottom: 10vh; }
  #joystick-wrapper { width: 120px; height: 120px; }
  .action-btn { width: 70px; height: 70px; }
}

@media (max-width: 900px) and (orientation: landscape) {
  #ui { transform: scale(0.85); transform-origin: top left; max-width: 50%; }
  #chat-container { width: 260px; top: 20px; right: 20px; bottom: auto; left: auto; height: 160px; }
  #mobile-controls { width: calc(100% - 60px); left: 30px; bottom: 10vh; }
  #joystick-wrapper { width: 100px; height: 100px; }
  .action-btn { width: 60px; height: 60px; }
}
</style>
