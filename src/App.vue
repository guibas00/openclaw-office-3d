<template>
  <div id="wrapper">
    <!-- Aviso de Orientação - Force Landscape -->
    <div id="landscape-warning" v-if="isMobile && !isLandscape">
      <h2>⚠️ Por favor, vire o celular na horizontal (Landscape Mode) para jogar.</h2>
    </div>
    
    <SkinSelectionScreen v-if="!isLoggedIn" @login="handleLogin" />
    <Scene v-else :playerName="playerName" :playerSkin="playerSkin" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import SkinSelectionScreen from './components/SkinSelectionScreen.vue';
import Scene from './components/Scene.vue';

const isLoggedIn = ref(false);
const playerName = ref('');
const playerSkin = ref(null);

function handleLogin(data) {
  playerName.value = data.name;
  playerSkin.value = data.skin;
  isLoggedIn.value = true;
}

const isMobile = ref(false);
const isLandscape = ref(true);

function checkOrientation() {
  isLandscape.value = window.innerWidth > window.innerHeight;
}

onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  if (isMobile.value) {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
  }
});

onUnmounted(() => {
  if (isMobile.value) {
    window.removeEventListener('resize', checkOrientation);
    window.removeEventListener('orientationchange', checkOrientation);
  }
});
</script>

<style scoped>
#wrapper { width: 100%; height: 100%; position: relative; }

#landscape-warning {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.95); color: #ddaa55; display: flex;
  justify-content: center; align-items: center; z-index: 9999;
  text-align: center; padding: 20px; font-family: 'Inter', sans-serif;
}
</style>
