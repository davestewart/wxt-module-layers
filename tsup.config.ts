import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./index.ts'],
  sourcemap: true,
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
})
