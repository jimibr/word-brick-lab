import { defineConfig, devices } from '@playwright/test';

const pagesPreview = process.env.PAGES_PREVIEW === '1';
const baseURL = pagesPreview
  ? 'http://127.0.0.1:4173/word-brick-lab/'
  : 'http://127.0.0.1:5173/';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: pagesPreview
      ? 'npm run preview:pages -- --host 127.0.0.1 --strictPort'
      : 'npm run dev -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
