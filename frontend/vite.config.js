import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,       // very important for WebSocket
        changeOrigin: true
      }
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.230.167', // optional, your LAN IP
      '6c9a-2409-40e3-304a-7046-6917-2a5f-c3ba-4f13.ngrok-free.app'
    ]
  }
})
