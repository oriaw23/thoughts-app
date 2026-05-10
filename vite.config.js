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
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/anthropic/, ''),
        },
        // Groq proxy — injects the API key server-side (users never see it)
        '/api/groq': {
          target: 'https://api.groq.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/groq/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (GROQ_KEY) {
                // Override / set key from server env — frontend sends nothing
                proxyReq.setHeader('Authorization', `Bearer ${GROQ_KEY}`)
              }
            })
          },
        },
      },
    },
  }
})
