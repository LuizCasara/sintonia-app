import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './tests/e2e',
  // Serve o site estático gerado por `pnpm build` (pasta out/).
  webServer: {
    command: `pnpm exec serve out -l ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Se PW_CHROME_PATH existir, usa esse Chrome em vez do baixado pelo Playwright.
        launchOptions: process.env.PW_CHROME_PATH
          ? { executablePath: process.env.PW_CHROME_PATH }
          : {},
      },
    },
  ],
});
