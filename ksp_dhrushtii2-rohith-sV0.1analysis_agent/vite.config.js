import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

  return {
    plugins: [react()],
    // Build output goes into dist/ — served by Flask or any static host
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      // Dev proxy: forwards API calls to Flask locally
      // In production, VITE_API_BASE_URL is used directly by apiClient.js
      proxy: {
        '/chat': {
          target: backendUrl,
          changeOrigin: true
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true
        },
        '/upload': {
          target: backendUrl,
          changeOrigin: true
        },
        '/standalone': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
