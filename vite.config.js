import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load .env / .env.local so GROQ_KEY is available here (server-side only)
  const env = loadEnv(mode, process.cwd(), '')
  const GROQ_KEY = env.GROQ_KEY || ''

  return {
    base: './',
    plugins: [react()],
    server: {
      proxy: {
        // All /api calls → local Express server (server/index.js)
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
