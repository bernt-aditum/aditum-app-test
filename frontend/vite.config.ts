import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_BASE (the app's FastAPI backend) and VITE_ADITUM_LOGIN are injected
// at build/deploy time. No secrets ever reach the frontend bundle.
export default defineConfig({
  plugins: [react()],
});
