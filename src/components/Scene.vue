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
        
        <div class="room-box">
          Sala: <strong>{{ roomCode }}</strong>
          <button v-if="roomCode !== 'public'" @click="copyRoom" class="copy-btn">📋 Copiar</button>
          <button @click="changeRoomDialog" class="copy-btn" style="background: #3388aa">🔄 Trocar</button>
        </div>

        <button v-if="isNearTv" @click="showTvMenu = true" class="cam-btn" style="background: #c4302b; color: #fff; margin-top: 10px; width: 100%;">
          📺 Acessar TV [E]
        </button>

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

    <!-- TV Playlist Modal -->
    <div id="tv-modal" v-if="showTvMenu">
      <div class="tv-modal-content">
        <div class="tv-header">
          <h3 style="margin: 0;">📺 Playlist da TV</h3>
          <button @click="showTvMenu = false" class="chat-close-btn" style="background:transparent; border:1px solid #ffaa55;">X</button>
        </div>
        <div class="tv-body">
          <div style="display: flex; gap: 5px; margin-bottom: 15px;">
            <input v-model="tvVideoUrl" placeholder="Link do YouTube..." class="chat-input" style="flex: 1; border-radius: 4px;" @keydown.enter="requestVideoAdd" />
            <button @click="requestVideoAdd" class="cam-btn" style="margin: 0; background: #55aadd; color: #fff;">Adicionar</button>
          </div>
          
          <h4 style="margin-top: 0;">Fila de Reprodução:</h4>
          <ul class="tv-queue">
            <li v-if="tvCurrentUrl" class="active-video">
              ▶️ <strong>Atual:</strong> {{ tvCurrentUrl }}
            </li>
            <li v-for="(url, idx) in tvQueue" :key="idx">
              {{ idx + 1 }}. {{ url }}
            </li>
            <li v-if="!tvCurrentUrl && tvQueue.length === 0" style="color: #888;">Fila vazia... O que vamos assistir?</li>
          </ul>
          
          <br>
          <button v-if="tvCurrentUrl || tvQueue.length > 0" @click="skipVideo" class="cam-btn" style="margin:0; background:#c4302b; color:#fff; width:100%;">Pular / Tocar Próximo ⏭️</button>
        </div>
      </div>
    </div>
    
    <!-- Proximity Prompt PC -->
    <div v-if="isNearPc && !showPcMenu && !showTvMenu && !isMobile" id="proximity-prompt">
      [E] Terminal OpenClaw
    </div>
    
    <!-- OpenClaw PC Terminal Modal -->
    <div id="pc-modal" v-if="showPcMenu">
      <div class="pc-modal-content">
        <div class="pc-header">
          <h3 style="margin: 0; color: #0f0; font-family: monospace;">> OPENCLAW_GATEWAY</h3>
          <button @click="showPcMenu = false" class="chat-close-btn" style="background:#0f0; color:#000; font-weight:bold;">X</button>
        </div>
        <div class="pc-body" ref="pcLogsRef">
          <div v-for="(log, idx) in openclawLogs" :key="idx" class="pc-log-line">
            <span class="pc-log-time">[{{ log.time }}]</span> <span class="pc-log-text">{{ log.text }}</span>
          </div>
          <div v-if="openclawLogs.length === 0" style="color: #060; font-family: monospace;">Aguardando conexões do Agente na porta 18789...</div>
        </div>
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
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const props = defineProps(['playerName', 'playerSkin', 'roomCode']); // Recebe a skin e a sala
const emit = defineEmits(['updateRoom']);
const container = ref(null);
const npcLocalStatus = ref('Ocioso');
const tvVideoUrl = ref('');
const tvId = ref('');
const tvCurrentUrl = ref('');
const tvQueue = ref([]);
const showTvMenu = ref(false);
const isNearTv = ref(false);

const openclawLogs = ref([]);
const isNearPc = ref(false);
const showPcMenu = ref(false);
const pcLogsRef = ref(null);

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

let scene, activeCamera, isoCamera, fpCamera, renderer, cssRenderer, tvIframeObj;
let socket;
let world, player, npc; // Moved these from the `let socket, scene, renderer, worlet` line
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

function copyRoom() {
  navigator.clipboard.writeText(props.roomCode);
  alert("Código da sala copiado: " + props.roomCode);
}

function changeRoomDialog() {
  const code = prompt("Digite o código da nova sala (ou deixe vazio para Sala Pública):");
  if (code !== null) {
    const newRoom = code.trim() || 'public';
    socket.emit('change_room', { room: newRoom });
    emit('updateRoom', newRoom);
    
    // Desconecta da chamada de voz se estiver em uma para limpar a sala
    if (voiceChat && inVoiceChat.value) {
      voiceChat.leaveVoiceChat();
      inVoiceChat.value = false;
    }
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
  window.addEventListener('click', onGlobalClick);
});

onUnmounted(() => {
  if (socket) socket.disconnect();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('click', onGlobalClick);
});

function onGlobalClick(e) {
  if (showTvMenu.value || showPcMenu.value || isMobile.value) return; 
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('#ui')) return;
  
  const mouse = new THREE.Vector2();
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, activeCamera);
  
  if (world && world.tvScreenMesh) {
    const intersectsTv = raycaster.intersectObject(world.tvScreenMesh);
    if (intersectsTv.length > 0) {
      if (isNearTv.value) showTvMenu.value = true;
      else alert("Aproxime-se da TV para interagir!");
      return;
    }
  }

  if (world && world.pcScreenMesh) {
    const intersectsPc = raycaster.intersectObject(world.pcScreenMesh);
    if (intersectsPc.length > 0) {
      if (isNearPc.value) showPcMenu.value = true;
      else alert("Aproxime-se do PC da Esquerda para acessar o Terminal OpenClaw!");
    }
  }
}

function requestVideoAdd() {
  const url = tvVideoUrl.value.trim();
  if (url && socket) {
    if (extractYouTubeId(url) === null) {
      alert("❌ Link do YouTube inválido! Formato ex: https://www.youtube.com/watch?v=...");
      return;
    }
    socket.emit('tv_add_queue', url);
    tvVideoUrl.value = '';
  }
}

function skipVideo() {
  if (socket) {
    socket.emit('tv_skip');
  }
}

function extractYouTubeId(url) {
  if (url.length === 11 && !url.includes('/') && !url.includes('?')) return url; // Already an ID
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return match ? match[1] : null;
}

function setupTV(videoId, elapsed = 0) {
  tvId.value = videoId;
  if (!world || !world.tvScreenMesh) return;
  
  if (tvIframeObj) {
    scene.remove(tvIframeObj);
    if(tvIframeObj.element) tvIframeObj.element.remove();
    tvIframeObj = null;
  }

  const div = document.createElement('div');
  div.style.width = '720px';
  div.style.height = '400px';
  div.style.backgroundColor = '#000';
  div.style.border = '5px solid #111';
  
  const iframe = document.createElement('iframe');
  iframe.id = 'youtube-iframe';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  let src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  if (elapsed > 0) src += `&start=${elapsed}`;
  iframe.src = src;
  iframe.frameBorder = '0';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  div.appendChild(iframe);
  
  tvIframeObj = new CSS3DObject(div);
  tvIframeObj.position.copy(world.tvScreenMesh.position);
  tvIframeObj.position.z += 0.05; // Front of clipping mesh
  tvIframeObj.rotation.copy(world.tvScreenMesh.rotation);
  tvIframeObj.scale.set(3.6 / 720, 2.0 / 400, 1);
  scene.add(tvIframeObj);
}

function changeLocalVideo(payload) {
  const url = typeof payload === 'string' ? payload : payload.url;
  const elapsed = payload.elapsed || 0;
  
  const videoId = extractYouTubeId(url);
  console.log("📺 Atualizando TV 3D para ID:", videoId, "Start:", elapsed);
  if (videoId) {
    tvId.value = videoId;
    if(!tvIframeObj) {
      setupTV(videoId, elapsed);
    } else {
      while (tvIframeObj.element.firstChild) {
          tvIframeObj.element.removeChild(tvIframeObj.element.firstChild);
      }
      const iframe = document.createElement('iframe');
      iframe.id = 'youtube-iframe';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      let src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      if (elapsed > 0) src += `&start=${elapsed}`;
      iframe.src = src;
      iframe.frameBorder = '0';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      tvIframeObj.element.appendChild(iframe);
    }
  } else {
    console.log("🔴 RegEx de YouTube falhou para:", url);
  }
}

function initThree() {
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;

  const d = 10;
  isoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
  isoCamera.position.set(10, 10, 10);
  isoCamera.lookAt(0, 0, 0);

  fpCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
  fpCamera.position.set(0, 1.6, 0);

  activeCamera = isoCamera;
  activeCamera.position.set(10, 10, 10);
  activeCamera.lookAt(0, 0, 0);

  // --- CSS3D Renderer ---
  cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = 'absolute';
  cssRenderer.domElement.style.top = '0px';
  cssRenderer.domElement.style.zIndex = '1';
  cssRenderer.domElement.style.pointerEvents = 'auto'; // allow interacting with video
  container.value.appendChild(cssRenderer.domElement);

  // --- WebGL Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: !isMobile.value, alpha: true });
  renderer.setClearColor(0x000000, 0); // Fundo furável para CSS3D
  renderer.setPixelRatio(isMobile.value ? 1.0 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isMobile.value; // Desabilita mapa de sombras inteiro no celular
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.2;
  
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0px';
  renderer.domElement.style.zIndex = '2';
  renderer.domElement.style.pointerEvents = 'none'; // Cliques passam pro CSS3D e html
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

  npc = new NPC(scene, null, 'OpenClaw');

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
    // Envia NOME, SKIN e ROOM no join
    socket.emit('join', { name: props.playerName, skin: props.playerSkin, room: props.roomCode });
  });

  socket.on('init_state', (state) => {
    // Remove jogadores antigos se estiver vindo de uma troca de sala
    for (let id in remotePlayers) {
      if (id !== socket.id) {
        scene.remove(remotePlayers[id].group); // Changed .mesh to .group as per Player class
        delete remotePlayers[id];
      }
    }
    
    npcLocalStatus.value = state.npcState ? state.npcState.status : 'Ocioso';
    if (npc) {
      npc.group.position.copy(state.npcState.pos); // Changed .mesh to .group as per NPC class
      npc.group.rotation.y = state.npcState.rot; // Changed .mesh to .group as per NPC class
    }
    
    for (let id in state.players) {
      if (id !== socket.id) {
        addRemotePlayer(state.players[id]); // Pass the player object directly
      }
    }
    
    tvCurrentUrl.value = state.tvUrl || '';
    tvQueue.value = state.tvQueue || [];
    openclawLogs.value = state.openClawLogs || [];
    
    if (state.tvUrl) {
      const elapsed = state.tvStartTime ? Math.floor((Date.now() - state.tvStartTime) / 1000) : 0;
      changeLocalVideo({ url: state.tvUrl, elapsed });
    } else {
      setupTV('jfKfPfyJRdk', 0); // Default video
    }
  });

  socket.on('tv_queue_update', (queue) => {
    tvQueue.value = queue;
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

  socket.on('npc_status', (status) => {
    npcLocalStatus.value = status;
  });

  socket.on('npc_update', (state) => {
    npcLocalStatus.value = state.status;
    if (npc) {
      if(state.pos && npc.group) {
          npc.group.position.set(state.pos.x, state.pos.y, state.pos.z);
          npc.group.rotation.y = state.rot;
      }
      if(state.commands) {
          npc.currentCommands = state.commands;
      }
    }
  });

  socket.on('npc_target', (target) => {
    if (npc) {
      npc.walkTo(target.x, target.z);
    }
  });

  socket.on('change_video', (data) => {
    if (!data) {
       tvCurrentUrl.value = '';
       tvId.value = '';
       tvQueue.value = [];
       if (tvIframeObj) { // clear screen or play ad
          setupTV('jfKfPfyJRdk', 0);
       }
       return;
    }
    const url = typeof data === 'string' ? data : data.url;
    const elapsed = data.tvStartTime ? Math.floor((Date.now() - data.tvStartTime) / 1000) : 0;
    tvCurrentUrl.value = url;
    changeLocalVideo({ url, elapsed });
  });

  socket.on('openclaw_log', (log) => {
    openclawLogs.value.push(log);
    if (openclawLogs.value.length > 100) openclawLogs.value.shift();
    setTimeout(() => {
      if (pcLogsRef.value) {
        pcLogsRef.value.scrollTop = pcLogsRef.value.scrollHeight;
      }
    }, 50);
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

// This function is now replaced by the npc.updateState in the socket.on('npc_update')
// function updateNPC(state) {
//   npc.group.position.set(state.pos.x, state.pos.y, state.pos.z);
//   npc.group.rotation.y = state.rot;
//   npc.currentCommands = state.commands;
// }

function onKeyDown(e) { 
  if (isChatFocused.value) return; 
  if (e.key.toLowerCase() === 'e') {
    if (isNearTv.value && !showTvMenu.value && !showPcMenu.value) {
      showTvMenu.value = true;
      keys['w'] = false; keys['a'] = false; keys['s'] = false; keys['d'] = false;
      return;
    }
    if (isNearPc.value && !showPcMenu.value && !showTvMenu.value) {
      showPcMenu.value = true;
      keys['w'] = false; keys['a'] = false; keys['s'] = false; keys['d'] = false;
      return;
    }
  }
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
    if (world) {
      if (world.tvScreenMesh) isNearTv.value = player.group.position.distanceTo(world.tvScreenMesh.position) < 2.5;
      if (world.pcScreenMesh) isNearPc.value = player.group.position.distanceTo(world.pcScreenMesh.position) < 2.5;
    }
    socket.emit('move', {
      pos: player.group.position,
      rot: player.group.rotation.y
    });

    // Position activeCamera based on mode
    if (!isFirstPerson.value && player && player.group) {
      const targetPos = player.group.position.clone().add(new THREE.Vector3(10, 10, 10));
      isoCamera.position.lerp(targetPos, 0.05);
      isoCamera.lookAt(player.group.position);
    }
  }

  Object.values(remotePlayers).forEach(remote => {
    remote.update(delta, {}, world.obstacles, remote._isMoving);
  });

  if (npc) {
    npc.update(delta, npc.currentCommands || {}, world.obstacles);
  }

  renderer.render(scene, activeCamera);
  if (cssRenderer) cssRenderer.render(scene, activeCamera);
}
</script>

<style scoped>
.scene-container { width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle, #1a1a1a 0%, #000000 100%); }
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
.room-box { margin-top: 10px; margin-bottom: 5px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 13px; }
.copy-btn { background: #555; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; margin-left: 10px; cursor: pointer; }
.copy-btn:hover { background: #777; }

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

#tv-modal {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8); z-index: 1000;
  display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif;
}
.tv-modal-content {
  background: #1a1a1a; border: 2px solid #55aadd; width: 400px;
  border-radius: 8px; color: #fff; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8);
}
.tv-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #2a2a2a; padding: 15px; border-bottom: 2px solid #333;
}
.tv-body {
  padding: 15px; max-height: 400px; overflow-y: auto;
}
.tv-queue {
  list-style: none; padding: 0; margin: 0 0 15px 0; background: #111; border: 1px solid #333; border-radius: 4px; padding: 10px;
}
.tv-queue li {
  padding: 5px 0; border-bottom: 1px dotted #333; font-size: 13px; color: #ccc;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tv-queue li:last-child { border-bottom: none; }
.active-video { color: #55aadd !important; }
.tv-btn {
  padding: 10px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s;
}
.tv-btn:hover { filter: brightness(1.2); }
#proximity-prompt {
  position: absolute; bottom: 20%; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.8); color: #fff; padding: 10px 20px;
  border: 1px solid #c4302b; border-radius: 6px; font-family: 'Inter', sans-serif; 
  font-weight: bold; z-index: 500; font-size: 18px; pointer-events: none;
}

#pc-modal {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 10, 0, 0.85); z-index: 1000;
  display: flex; justify-content: center; align-items: center; font-family: 'Courier New', Courier, monospace;
}
.pc-modal-content {
  background: #000; border: 2px solid #0f0; width: 600px;
  border-radius: 4px; color: #0f0; overflow: hidden; box-shadow: 0 0 30px rgba(0,255,0,0.3);
}
.pc-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #020; padding: 15px; border-bottom: 2px solid #0f0;
}
.pc-body {
  padding: 15px; height: 350px; overflow-y: auto; background: #000; word-wrap: break-word;
}
.pc-log-line {
  margin-bottom: 8px; font-size: 13px; line-height: 1.4;
}
.pc-log-time {
  color: #080; margin-right: 5px;
}
.pc-log-text {
  color: #0f0;
}
</style>
