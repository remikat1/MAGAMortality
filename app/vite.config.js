import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages-friendly default (relative asset paths).
export default defineConfig({
  plugins: [react()],
  base: './',
});

