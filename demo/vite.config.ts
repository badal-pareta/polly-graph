import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  // Resolve imports to parent directory source files
  resolve: {
    alias: {
      // Map polly-graph imports to source files
      'polly-graph': path.resolve(__dirname, '../src'),
      '@': path.resolve(__dirname, './src')
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: true
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Don't minify for easier debugging
    minify: false
  },

  // Optimizations
  optimizeDeps: {
    // Pre-bundle D3 for faster dev startup
    include: ['d3']
  }
})