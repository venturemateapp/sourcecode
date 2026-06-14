import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    proxy: {
      '/graphql': {
        target: process.env.VITE_GRAPHQL_PROXY_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_AUTH_PROXY_URL || 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: ['compliance-react-frontend-bfc328063949.herokuapp.com', 'venturemate.net', 'www.venturemate.net'],
  },
})
