import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('/home/saidharahas/buzzdoc/key.pem'),
      cert: fs.readFileSync('/home/saidharahas/buzzdoc/cert.pem'),
    },
    port: 5173,  // or your port
  }
})
