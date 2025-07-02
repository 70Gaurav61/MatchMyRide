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
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.230.167', // optional, your LAN IP
      '5247-2409-40e3-3001-c33a-9144-e356-bd6b-20a5.ngrok-free.app'
    ]
  }
})
