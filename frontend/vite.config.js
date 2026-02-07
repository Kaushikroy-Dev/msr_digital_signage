import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: '/', // Changed from './' to fix routing on sub-pages like /player/:id
    server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks: undefined
            },
            // Exclude test-platforms.js from production builds
            external: (id) => {
                if (process.env.NODE_ENV === 'production' && id.includes('test-platforms')) {
                    return true;
                }
                return false;
            }
        },
        // Exclude test files from production build
        copyPublicDir: true
    }
})
