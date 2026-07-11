import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './supabase/functions/_shared/engine'),
    },
  },
  test: {
    environment: 'node',
    include: ['supabase/functions/_shared/engine/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
