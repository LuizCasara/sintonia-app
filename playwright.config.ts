import { defineConfig, devices } from '@playwright/test';

// PW_PORT permite trocar a porta quando a 3100 está ocupada por outro projeto.
const PORT = Number(process.env.PW_PORT ?? 3100);

export default defineConfig({
  testDir: './tests/e2e',
  // No CI: relatório HTML para baixar quando algo falha, e uma nova tentativa contra falha de rede.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  retries: process.env.CI ? 1 : 0,
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
        // Sem espera cinematográfica na tela de processamento (ela respeita "reduzir movimento").
        reducedMotion: 'reduce',
        // Se PW_CHROME_PATH existir, usa esse Chrome em vez do baixado pelo Playwright.
        launchOptions: process.env.PW_CHROME_PATH
          ? { executablePath: process.env.PW_CHROME_PATH }
          : {},
      },
    },
  ],
});
