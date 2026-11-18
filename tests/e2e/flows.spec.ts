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

async function consentAndUpload(
  page: import('@playwright/test').Page,
  files: string[] | { name: string; mimeType: string; buffer: Buffer }[],
) {
  await page.goto('/pt/');
  await page.getByRole('checkbox').check();
  await page.getByTestId('file-input').setInputFiles(files);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('um app com 2 autores pula o Confirmar e abre o relatório real', async ({ page }) => {
  await consentAndUpload(page, ['fixtures/whatsapp/android-pt.txt']);
  await expect(page).toHaveURL(/\/pt\/processing\/?$/);
  await expect(page).toHaveURL(/\/pt\/report\/timeline\/?$/);
  await expect(page.getByText('Dados fictícios de demonstração')).toBeHidden();
});

test('WhatsApp + Telegram passam pelo Confirmar', async ({ page }) => {
  await consentAndUpload(page, [
    'fixtures/whatsapp/android-pt.txt',
    'fixtures/telegram/result.json',
  ]);
  await expect(page).toHaveURL(/\/pt\/confirm\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Confirme quem é quem');
  // Ignorar os dois nomes da Pessoa B desabilita o "Analisar"; devolver um deles reabilita.
  const bruno = page.getByRole('combobox', { name: 'Quem é Bruno Reis?' });
  await bruno.first().selectOption('ignore');
  await bruno.first().selectOption('ignore');
  await expect(page.getByRole('button', { name: 'Analisar' })).toBeDisabled();
  await bruno.first().selectOption('B');
  await expect(page.getByRole('button', { name: 'Analisar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Analisar' }).click();
  await expect(page).toHaveURL(/\/pt\/report\/timeline\/?$/);
});

test('arquivo .zip mostra o erro em vez de travar', async ({ page }) => {
  await consentAndUpload(page, [
    { name: 'conversa.zip', mimeType: 'application/zip', buffer: Buffer.from('PK') },
  ]);
  await expect(page.getByRole('alert').filter({ hasText: '.zip' })).toBeVisible();
  await expect(page).toHaveURL(/\/pt\/?$/);
});

test('processando sem arquivos mostra o aviso e volta ao início', async ({ page }) => {
  await page.goto('/pt/processing/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nenhum arquivo para processar');
  await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await expect(page).toHaveURL(/\/pt\/?$/);
});

test('passar o mouse na linha do tempo mostra os números do mês', async ({ page }) => {
  await page.goto('/pt/report/timeline/');
  const track = page.locator('[role=group][tabindex="0"]');
  const box = await track.boundingBox();
  expect(box).not.toBeNull();
  await expect(page.getByTestId('timeline-tooltip')).toBeHidden();
  await page.mouse.move(box!.x + 220, box!.y + 90);
  const tip = page.getByTestId('timeline-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Ana Lima');
  await expect(tip).toContainText('no mês');
  await page.mouse.move(box!.x + 220, box!.y - 60); // fora da linha do tempo
  await expect(tip).toBeHidden();
});

test('a linha do tempo tem marcos da jornada além das primeiras vezes e fases', async ({
  page,
}) => {
  await page.goto('/pt/report/timeline/');
  const counter = await page.getByText(/Marco 1 de \d+/).textContent();
  const total = Number(/de (\d+)/.exec(counter ?? '')?.[1]);
  expect(total).toBeGreaterThan(8); // a demo tinha 4 primeiras vezes + 4 fases
  await expect(page.getByRole('button', { name: /anos de conversa/ }).first()).toBeVisible();
});

test('painel mostra Sintonia e Equilíbrio com as partes de cada nota', async ({ page }) => {
  await page.goto('/pt/report/dashboard/');
  await page.getByRole('button', { name: /Sintonia/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Reciprocidade');
  await expect(dialog).toContainText('Tempo de resposta');
  await expect(dialog).toContainText('peso 40%');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Equilíbrio/ }).click();
  await expect(dialog).toContainText('Quem abre as conversas');
  await expect(dialog).toContainText('Nota alta não quer dizer relação melhor');
});

test('histórico curto de verdade: a Sintonia explica por que não tem nota', async ({ page }) => {
  await consentAndUpload(page, ['fixtures/whatsapp/android-pt.txt']);
  await expect(page).toHaveURL(/report\/timeline/);
  await page
    .getByRole('link', { name: /Painel/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: /Sintonia/ })).toContainText(
    'Histórico curto demais',
  );
  await expect(page.getByRole('button', { name: /Equilíbrio/ })).toContainText('de 10');
});

test('linha do tempo mostra o ritmo de resposta por ano', async ({ page }) => {
  await page.goto('/pt/report/timeline/');
  const strip = page.getByRole('list', { name: 'Ritmo de resposta por ano' });
  await expect(strip.getByRole('listitem').first()).toBeVisible();
  await expect(page.getByText(/Não é uma nota/)).toBeVisible();
});
