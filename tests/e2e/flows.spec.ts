import { expect, test } from '@playwright/test';

test('dropzone fica desabilitada sem o consentimento', async ({ page }) => {
  await page.goto('/pt/');
  const input = page.getByTestId('file-input');
  await expect(input).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();

  await page.getByRole('checkbox').check();
  await expect(input).toBeEnabled();
  await input.setInputFiles('fixtures/whatsapp/android-pt.txt');
  await expect(page.getByText('WhatsApp (Android)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();
});

test('teclado avança o marco na linha do tempo', async ({ page }) => {
  await page.goto('/pt/report/timeline/');
  const heading = page.getByRole('heading', { level: 2 });
  const before = await heading.textContent();
  await page.locator('[role=group][tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(heading).not.toHaveText(before ?? '');
  await expect(page.getByText(/Marco 2 de/)).toBeVisible();
});

test('clique no card abre o detalhe e Esc fecha', async ({ page }) => {
  await page.goto('/en/report/dashboard/');
  await page.getByRole('button', { name: /Messages per person/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('copiar prompt mostra "Copiado!"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/pt/report/actions/');
  await page.getByRole('button', { name: 'Copiar prompt' }).click();
  await expect(page.getByText('Copiado!')).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Ana Lima');
  expect(text).not.toContain('jujuba'); // dicionário desmarcado
});

test('apagar tudo volta ao início', async ({ page }) => {
  await page.goto('/pt/report/actions/');
  await page.getByRole('button', { name: 'Apagar tudo' }).click();
  await page.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(page).toHaveURL(/\/pt\/?$/);
});
