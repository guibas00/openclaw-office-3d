import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [vue(), basicSsl()],
  server: {
    port: 80,
    host: '0.0.0.0', // Garante que o servidor bind em todas as interfaces para DNS e rede externa
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
});
