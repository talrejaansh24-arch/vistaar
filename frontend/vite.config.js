import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev: proxy API requests to the local FastAPI server
    proxy: {
      '/api': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    }
  },
  build: {
    // Output directly to dist folder — FastAPI will serve from here in production
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
  }
})
