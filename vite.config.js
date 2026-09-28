import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // caminhos relativos: funciona no GitHub Pages e em qualquer subpasta
  base: './',
  plugins: [tailwindcss()],
})
