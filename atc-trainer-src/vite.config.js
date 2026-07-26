import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/atc-trainer/",
  build: {
    outDir: "../atc-trainer",
    emptyOutDir: true,
  },
});