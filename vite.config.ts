
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: [
      "buffer",
      "@solana/web3.js",
      "@solana/spl-token",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-phantom",
      "@solana/wallet-adapter-solflare"
    ]
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
});
