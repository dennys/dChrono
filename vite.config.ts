import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json' with { type: 'json' }
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        alarm: resolve(__dirname, 'src/alarm.html'),
      },
    },
  },
})