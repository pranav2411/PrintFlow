import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5050',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5050',
        ws: true
      }
    }
  }
})
