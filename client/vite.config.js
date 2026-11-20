import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, forward /api to the Express server so the app works without CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:4000' },
  },
})
