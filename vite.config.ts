import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { distributionLicenses } from './scripts/distribution-licenses';

export default defineConfig({
  plugins: [react(), distributionLicenses()],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
