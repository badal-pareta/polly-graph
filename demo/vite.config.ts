import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true, // Errors out if 3000 is taken instead of picking 3001
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
});