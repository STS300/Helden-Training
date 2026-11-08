import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:8099', trace: 'retain-on-failure' },
  webServer: {
    command: 'cd ../.. && "${HELDEN_PYTHON:-python3}" -m tests.serve_e2e',
    url: 'http://127.0.0.1:8099/api/health',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
