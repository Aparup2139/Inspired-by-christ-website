import { defineConfig, devices } from '@playwright/test';

// Not 4321: that is `astro dev`'s port, and reusing a running dev server would test unbuilt code.
const port = 4322;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Tests run against the production build served by `astro preview`, not the dev server.
  webServer: {
    command: `npm run build && npx astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
