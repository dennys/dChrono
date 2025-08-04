import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
})


// export default defineConfig({
//   plugins: [crx({ manifest })],
//   build: {
//     rollupOptions: {
//       output: {
//         chunkFileNames: 'assets/[name]-[hash].js',
//         entryFileNames: 'assets/[name]-[hash].js',
//         assetFileNames: 'assets/[name]-[hash].[ext]'
//       }
//     }
//   }
// })