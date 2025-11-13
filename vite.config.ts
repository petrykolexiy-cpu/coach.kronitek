import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the client.
    // This makes process.env.API_KEY available in the browser code.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})