<template>
  <div id="wrapper">
    <SkinSelectionScreen v-if="!isLoggedIn" @login="handleLogin" />
    <Scene v-else :playerName="playerName" :playerSkin="playerSkin" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
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
</script>

<style scoped>
#wrapper { width: 100%; height: 100%; position: relative; }
</style>
