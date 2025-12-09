import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    base: '/learn-spanish-quickly/',
    server: {
        port: 5173
    }
});
