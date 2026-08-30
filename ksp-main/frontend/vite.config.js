import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All API routes go to single unified backend on port 5000
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/chat': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/agent_api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/standalone': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/upload': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
})

