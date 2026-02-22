import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/sidenote/',
  server: {
    proxy: {
      '/api': {
        target: 'https://sidenote-8nu4.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    allowedHosts: [
      "sidenote-7o2d.onrender.com",
      "https://sidenote-8nu4.onrender.com",
      "alakh11.github.io"
    ],
  },

  build: {
    chunkSizeWarningLimit: 1000 // in KB (1000 KB = 1 MB)
  }
})