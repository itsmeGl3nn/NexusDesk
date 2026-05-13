import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localstackEndpoint = env.LOCALSTACK_ENDPOINT ?? 'http://localhost:4566'
  const apiId = env.VITE_LOCALSTACK_API_ID ?? ''

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target: localstackEndpoint,
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api/, `/restapis/${apiId}/dev/_user_request_`),
        },
      },
    },
  }
})