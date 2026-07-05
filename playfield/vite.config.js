import { defineConfig } from 'vite'

// `target: esnext` est requis pour le top-level await utilise par
// l'init Rapier dans `src/main.js` (cf. adapters/physics/rapier/init.js).
export default defineConfig(({ mode }) => ({
  server: { port: 5173, strictPort: true, host: true },
  build: { target: 'esnext' },
  // Supprime les console.* et debugger du bundle de prod (garde le debug en dev).
  esbuild: { drop: mode === 'production' ? ['console', 'debugger'] : [] },
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' },
    include: ['three/addons/environments/RoomEnvironment.js'],
  },
}))
