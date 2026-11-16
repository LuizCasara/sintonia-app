import { expect, test } from '@playwright/test';

const routes = [
  '',
  'confirm/',
  'processing/',
  'report/timeline/',
  'report/dashboard/',
  'report/actions/',
];

for (const locale of ['pt', 'en']) {
  for (const route of routes) {
    test(`/${locale}/${route} mostra um heading`, async ({ page }) => {
      await page.goto(`/${locale}/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
}
