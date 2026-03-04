import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you don't already have @vitejs/plugin-react installed, run:
// npm i -D @vitejs/plugin-react
export default defineConfig({
  plugins: [react()],
});
