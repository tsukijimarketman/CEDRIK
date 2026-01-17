import { defineConfig } from 'vite'

export default defineConfig({
  // do change this configuration is for the server
  // for local do not push the changes
  base: "/cyber-education/",
  // base: '/',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5174,
  }
})
