/// <reference types="vitest" />
import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { webdriverio } from '@vitest/browser-webdriverio'

// --- Ketcher WASM Copy Logic ---
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const sourceDir = path.resolve(__dirname, 'node_modules/ketcher-standalone/dist/binaryWasm')
  const destDir = path.resolve(__dirname, 'public')

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir)
    files.forEach(file => {
      const src = path.join(sourceDir, file)
      const stats = fs.statSync(src)
      if (stats.isFile()) {
        const dest = path.join(destDir, file)
        fs.copyFileSync(src, dest)

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
        }
      }
    })
  }
} catch (e) {
  console.error('[Vite Config] Error copying Ketcher files:', e)
}

// --- Main Config ---
export default defineConfig({
  // 1. ADD THE PLUGINS (Crucial for React)
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    // 2. DISABLE INLINE SOURCEMAPS IN DEV
    // This stops the "jumping" to that giant base64 line
    sourcemapIgnoreList: false,
  },

  define: {
    'process.env': {},
    global: 'window',
  },

  build: {
    // 3. FORCE SOURCEMAPS TO BE SEPARATE FILES
    // This prevents the huge strings from being appended to your JS
    // Set to false in production if memory is an issue
    sourcemap: process.env.NODE_ENV !== 'production',
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
  },

  test: {
    globals: true, // Recommended for Vitest
    environment: 'jsdom', // Standard for React testing
    browser: {
      enabled: true,
      provider: webdriverio({}),
      instances: [
        { browser: 'chrome' }
      ]
    },
    setupFiles: ['./vitest.setup.ts'],
  },
} as UserConfig & { test: any })