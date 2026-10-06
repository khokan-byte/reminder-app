import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the app from /reminder-app/; local/Vercel builds stay at /.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/reminder-app/' : '/',
  plugins: [react()],
});
