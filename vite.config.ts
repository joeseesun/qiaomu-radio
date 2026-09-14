import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement: fileURLToPath(new URL("./node_modules/three/src/Three.js", import.meta.url)),
      },
    ],
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
