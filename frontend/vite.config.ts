import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Pointing to the file visible in your screenshot:
      'react-map-gl': path.resolve(__dirname, 'node_modules/react-map-gl/dist/mapbox.js'),
    },
  },
})