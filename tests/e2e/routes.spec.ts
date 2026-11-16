import { expect, test } from '@playwright/test';

const routes = [
  '',
  'confirm/',
  'processing/?auto=0', // ?auto=0 = não avança sozinho
  'report/timeline/',
  'report/dashboard/',
  'report/actions/',
];

for (const locale of ['pt', 'en']) {
  for (const route of routes) {
    test(`/${locale}/${route} mostra o heading principal`, async ({ page }) => {
      await page.goto(`/${locale}/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
}

// Mobile (390px) e desktop (1440px): nada de rolagem horizontal na página
for (const [name, width, height] of [
  ['mobile', 390, 844],
  ['desktop', 1440, 900],
] as const) {
  test.describe(`sem rolagem horizontal (${name})`, () => {
    test.use({ viewport: { width, height } });
    for (const route of routes) {
      test(`/pt/${route}`, async ({ page }) => {
        await page.goto(`/pt/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
}
