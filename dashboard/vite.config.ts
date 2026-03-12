import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/oauth': 'http://localhost:3001',
      '/sync': 'http://localhost:3001',
      '/upload': 'http://localhost:3001',
      // '/webhook': 'http://localhost:3001',  // Terra disabled
    },
  },
})
