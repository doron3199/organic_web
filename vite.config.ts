import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Auto-copy Ketcher WASM files to public folder
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  // Copy ALL files from the binaryWasm directory (wasm, js, maps)
  const sourceDir = path.resolve(__dirname, 'node_modules/ketcher-standalone/dist/binaryWasm')
  const destDir = path.resolve(__dirname, 'public')

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  // Get all files in source directory
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir)
    files.forEach(file => {
      const src = path.join(sourceDir, file)
      const stats = fs.statSync(src)
      if (stats.isFile()) {
        const dest = path.join(destDir, file)
        fs.copyFileSync(src, dest)
        console.log(`[Vite Config] Copied ${file} to public/`)

        // Create standard aliases for versioned files to ensure Ketcher can find them
        let alias = null;
        if (file.match(/indigo-ketcher-\d+\.\d+\.\d+\.wasm$/)) {
          alias = 'indigo-ketcher.wasm';
        } else if (file.match(/indigo-ketcher-norender-\d+\.\d+\.\d+\.wasm$/)) {
          alias = 'indigo-ketcher-norender.wasm';
        } else if (file.match(/indigoWorker-[a-f0-9]+\.js$/)) {
          alias = 'indigoWorker.js';
        }

        if (alias) {
          fs.copyFileSync(src, path.join(destDir, alias));
          console.log(`[Vite Config] Created alias: ${alias} -> ${file}`);
        }
      }
    })
  } else {
    console.warn(`[Vite Config] Warning: Source dir ${sourceDir} not found`)
  }
} catch (e) {
  console.error('[Vite Config] Error copying Ketcher files:', e)
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (IPv4 + IPv6)
    port: 5173,
  },
  define: {
    'process.env': {},
    global: 'window',
  },
})
