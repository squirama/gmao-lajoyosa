import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const frontendPort = Number(process.env.FRONTEND_PORT || 3000)
const backendTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:3001'

export default defineConfig({
    plugins: [react()],
    server: {
        port: frontendPort,
        strictPort: true,
        host: true,
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true,
                secure: false,
            },
            '/documents': {
                target: backendTarget,
                changeOrigin: true,
                secure: false,
            },
            '/manuals': {
                target: backendTarget,
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        outDir: '../backend/dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    calendar: ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/react', 'react-big-calendar'],
                    dnd: ['react-dnd', 'react-dnd-html5-backend'],
                    vendor: ['axios', 'date-fns'],
                }
            }
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.js',
    }
})
