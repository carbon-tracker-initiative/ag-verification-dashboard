// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://carbon-tracker-initiative.github.io',
  base: '/ag-verification-dashboard',
  output: 'static', // Changed from 'server' to 'static' for GitHub Pages
  vite: {
    plugins: [tailwindcss()],
  },
});
