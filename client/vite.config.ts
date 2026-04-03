import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'https://api.sidenote.in',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    allowedHosts: [
      "https://api.sidenote.in",
      "https://www.sidenote.in"
    ],
  },

  build: {
    chunkSizeWarningLimit: 1000 // in KB (1000 KB = 1 MB)
  }
})
