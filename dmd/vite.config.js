import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  server: { port: 5175, strictPort: true, host: true },
  // Supprime les console.* et debugger du bundle de prod (garde le debug en dev).
  esbuild: { drop: mode === 'production' ? ['console', 'debugger'] : [] },
}))
