<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="title">✨ COZY WORLD ✨</h1>
      <p class="subtitle">Multiplayer 3D Virtual Room</p>
      
      <div class="input-section">
        <label>Nome do Avatar:</label>
        <input v-model="name" placeholder="Escreva seu nome..." @keyup.enter="start" class="main-input" />
      </div>

      <div class="input-section room-section">
        <label>Tipo de Sala:</label>
        <div class="room-buttons">
          <button :class="{ active: roomType === 'public' }" @click="roomType = 'public'">🌐 Pública</button>
          <button :class="{ active: roomType === 'private' }" @click="roomType = 'private'">🔒 Privada</button>
        </div>
        <div v-if="roomType === 'private'" style="margin-top: 10px;">
          <input v-model="roomCode" placeholder="Código (vazio p/ criar nova)" class="main-input" />
        </div>
      </div>

      <div class="skin-system">
        <label>Escolha sua Skin:</label>
        <div class="preset-grid">
          <div 
            v-for="(s, key) in skins" :key="key" 
            class="skin-card" 
            :class="{ active: selectedSkin === key }"
            @click="selectedSkin = key"
            :style="{ borderColor: s.shirt }"
          >
            <div class="skin-preview" :style="{ background: s.shirt }"></div>
            <span>{{ s.label }}</span>
          </div>
          <div 
            class="skin-card custom-card" 
            :class="{ active: selectedSkin === 'custom' }"
            @click="selectedSkin = 'custom'"
          >
            <div class="skin-preview multi"></div>
            <span>Custom</span>
          </div>
        </div>

        <div v-if="selectedSkin === 'custom'" class="custom-panel">
          <div class="color-row">
            <span>👕 Camisa:</span> <input type="color" v-model="customData.shirt" />
          </div>
          <div class="color-row">
            <span>👖 Calça:</span> <input type="color" v-model="customData.pants" />
          </div>
          <div class="color-row">
            <span>👤 Pele:</span> <input type="color" v-model="customData.skin" />
          </div>
        </div>
      </div>

      <button class="join-btn" @click="start">CONECTAR</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';

const name = ref('');
const selectedSkin = ref('blue');
const roomType = ref('public');
const roomCode = ref('');
const emit = defineEmits(['login']);

const skins = {
  blue: { label: 'Cyber Blue', shirt: '#2e5a88', pants: '#111111', skin: '#ffdbac' },
  brown: { label: 'Cozy Brown', shirt: '#4a3728', pants: '#222222', skin: '#efd1b1' },
  purple: { label: 'Lofi Purple', shirt: '#6a4a7a', pants: '#1a1a1a', skin: '#ffe0bd' }
};

const customData = reactive({
  shirt: '#ffffff',
  pants: '#333333',
  skin: '#ffdbac'
});

function start() {
  if (!name.value.trim()) return;
  const skin = selectedSkin.value === 'custom' ? { ...customData } : { ...skins[selectedSkin.value] };
  let finalRoomCode = 'public';
  if (roomType.value === 'private') {
    finalRoomCode = roomCode.value.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  emit('login', { name: name.value.trim(), skin, roomCode: finalRoomCode });
}
</script>

<style scoped>
.login-container {
  display: flex; justify-content: center; align-items: flex-start;
  width: 100vw; height: 100vh; background: radial-gradient(circle, #1a1a1a 0%, #000000 100%);
  color: #ddaa55; font-family: 'Inter', sans-serif;
  overflow-y: auto; padding: 30px 0; box-sizing: border-box;
}
.login-box {
  background: rgba(15, 15, 15, 0.98); padding: 30px; border: 2px solid #ddaa55;
  border-radius: 20px; text-align: center; box-shadow: 0 0 60px rgba(0,0,0,1);
  width: 380px; max-width: 90vw; margin: auto; backdrop-filter: blur(10px);
}
.title { font-size: 28px; margin: 0; text-shadow: 0 0 10px #ddaa55; letter-spacing: 2px; }
.subtitle { opacity: 0.7; font-size: 14px; margin: 10px 0 30px; }

.input-section { margin-bottom: 25px; text-align: left; }
.main-input {
  width: 100%; padding: 14px; background: #222; border: 1px solid #444; color: #fff;
  border-radius: 10px; box-sizing: border-box; outline: none; transition: border-color 0.3s;
}
.main-input:focus { border-color: #ddaa55; }

.room-buttons { display: flex; gap: 10px; margin-top: 5px; }
.room-buttons button {
  flex: 1; padding: 10px; background: #222; color: #fff; border: 1px solid #444;
  border-radius: 8px; cursor: pointer; transition: 0.2s; font-family: 'Inter', sans-serif;
}
.room-buttons button.active { background: #ddaa55; color: #000; border-color: #ddaa55; font-weight: bold; }

.skin-system { text-align: left; margin-bottom: 30px; }
.preset-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
.skin-card {
  background: #222; padding: 8px; border-radius: 8px; cursor: pointer;
  text-align: center; border: 2px solid transparent; transition: all 0.2s;
}
.skin-card span { font-size: 10px; display: block; margin-top: 5px; }
.skin-card.active { border-color: #fff; transform: translateY(-5px); }

.skin-preview { width: 100%; height: 30px; border-radius: 4px; }
.skin-preview.multi { background: linear-gradient(45deg, red, green, blue); }

.custom-panel { background: #1a1a1a; padding: 12px; border-radius: 10px; margin-top: 15px; border: 1px solid #333; }
.color-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }
input[type="color"] { background: none; border: none; width: 34px; height: 34px; cursor: pointer; }

.join-btn {
  width: 100%; background: #ddaa55; color: #000; border: none; padding: 18px;
  cursor: pointer; font-weight: bold; border-radius: 12px; font-size: 18px;
  transition: all 0.3s;
}
.join-btn:hover { background: #ffcc00; box-shadow: 0 0 20px rgba(221, 170, 85, 0.4); }
</style>
