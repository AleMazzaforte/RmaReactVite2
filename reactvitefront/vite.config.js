import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [    
    react(),
    tailwindcss(),
  ],
  css: {
    postcss: './postcss.config.mjs',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Agrupa librerías de PDF/imágenes en un chunk separado
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) {
              return 'pdf-utils';
            }
            if (id.includes('axios')) {
              return 'network';
            }
            // El resto de node_modules en un chunk "vendor"
            return 'vendor';
          }
        }
      }
    },
  }
})

