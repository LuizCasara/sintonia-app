import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { zipSync } from 'fflate';

test('dropzone fica desabilitada sem o consentimento', async ({ page }) => {
  await page.goto('/pt/start/');
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
  await page.goto('/pt/start/');
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
  await expect(page).toHaveURL(/\/pt\/start\/?$/);
});

test('.zip do WhatsApp abre e vai direto ao relatório real', async ({ page }) => {
  const chat = new Uint8Array(readFileSync('fixtures/whatsapp/android-pt.txt'));
  const buffer = Buffer.from(
    zipSync({ '_chat.txt': chat, 'IMG-0001.jpg': new Uint8Array([1, 2, 3]) }),
  );
  await consentAndUpload(page, [
    { name: 'WhatsApp Chat.zip', mimeType: 'application/zip', buffer },
  ]);
  await expect(page).toHaveURL(/\/pt\/report\/timeline\/?$/);
  await expect(page.getByText('Dados fictícios de demonstração')).toBeHidden();
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

test('cada marco tem texto rico: quem falou mais, o que veio depois e o tempo de conversa', async ({
  page,
}) => {
  await page.goto('/pt/report/timeline/');
  const facts = page.getByTestId('timeline-facts');
  await page.locator('[role=group][tabindex="0"]').focus();
  await expect(page.getByText(/Marco 1 de \d+/)).toBeVisible();
  // Anda pelos marcos: um pico ou vale mostra o mês seguinte e o tempo desde o início.
  let seenLead = false;
  let seenNext = false;
  let seenSince = false;
  for (let i = 0; i < 40 && !(seenLead && seenNext && seenSince); i++) {
    const text = (await facts.textContent()) ?? '';
    if (/falou mais|quase o mesmo tanto/.test(text)) seenLead = true;
    if (/No mês seguinte/.test(text)) seenNext = true;
    if (/Aconteceu quando vocês tinham .* de conversa/.test(text)) seenSince = true;
    await page.keyboard.press('ArrowRight');
  }
  expect(seenLead).toBe(true);
  expect(seenNext).toBe(true);
  expect(seenSince).toBe(true);
});

test('a home leva ao /start pelo CTA', async ({ page }) => {
  await page.goto('/pt/');
  await page.getByRole('link', { name: 'Descobrir nossa sintonia' }).first().click();
  await expect(page).toHaveURL(/\/pt\/start\/?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Vamos começar' })).toBeVisible();
});

test('painel: tempo de conversa e palavras em livros de Harry Potter', async ({ page }) => {
  await page.goto('/pt/report/dashboard/');
  await page.getByRole('button', { name: /Tempo de conversa/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Dias com mensagem');
  await expect(dialog).toContainText('Maior sequência de dias seguidos');
  await page.keyboard.press('Escape');

  const book = page.getByRole('button', { name: /Em livros/ });
  await expect(book).toContainText('de 7 livros de Harry Potter');
  await book.click();
  await expect(dialog).toContainText('A Pedra Filosofal');
  await expect(dialog).toContainText('As Relíquias da Morte');
  await expect(dialog).toContainText('1.084.170');
});

test('esconder uma palavra no painel tira ela do prompt compartilhado', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/pt/report/dashboard/');
  const words = page.getByTestId('words-card');
  await expect(words).toContainText('jujuba');
  await expect(words.getByTestId('word-count').first()).toContainText('×');
  await expect(words.getByText('Ana diz mais')).toBeVisible();
  const hide = words.getByRole('button', { name: /Esconder “jujuba”/ });
  await expect(hide).toHaveAttribute('aria-pressed', 'false');
  await hide.click();
  await expect(words.getByRole('button', { name: /Mostrar “jujuba”/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(words).toContainText('1 escondida');

  // navegação dentro do app mantém a escolha (nada é salvo no navegador)
  await page.getByRole('link', { name: 'Ações' }).first().click();
  await page.getByRole('checkbox', { name: /dicionário do casal/ }).check();
  await expect(page.getByText(/1 palavra escondida no painel fica de fora/)).toBeVisible();
  await page.getByRole('button', { name: 'Copiar prompt' }).click();
  await expect(page.getByText('Copiado!')).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('bolinho');
  expect(text).not.toContain('jujuba');
});

test.describe('processando com ritmo cinematográfico', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('não passa de uma vez: a barra sobe aos poucos e só então abre o relatório', async ({
    page,
  }) => {
    await consentAndUpload(page, ['fixtures/whatsapp/android-pt.txt']);
    await expect(page).toHaveURL(/\/pt\/processing\/?$/);
    const bar = page.getByRole('progressbar');
    await page.waitForTimeout(1000);
    const early = Number(await bar.getAttribute('aria-valuenow'));
    expect(early).toBeLessThan(60); // o Worker já terminou, mas a tela segura o ritmo
    await expect(page).toHaveURL(/\/pt\/processing\/?$/);
    await expect(page).toHaveURL(/\/pt\/report\/timeline\/?$/, { timeout: 20_000 });
  });
});

test('o último marco da linha do tempo leva ao Painel', async ({ page }) => {
  await page.goto('/pt/report/timeline/');
  await page.locator('[role=group][tabindex="0"]').focus();
  const toDashboard = page.getByRole('link', { name: /Ver o painel/ });
  for (let i = 0; i < 60 && !(await toDashboard.isVisible()); i++) {
    await page.keyboard.press('ArrowRight');
  }
  await toDashboard.click();
  await expect(page).toHaveURL(/\/pt\/report\/dashboard\/?$/);
});

test.describe('ações', () => {
  async function analyzeAndOpenActions(page: import('@playwright/test').Page) {
    await consentAndUpload(page, ['fixtures/whatsapp/android-pt.txt']);
    await expect(page).toHaveURL(/report\/timeline/);
    await page.getByRole('link', { name: 'Ações' }).first().click();
  }

  test('a demonstração não pode ser salva', async ({ page }) => {
    await page.goto('/pt/report/actions/');
    await expect(page.getByRole('button', { name: 'Salvar neste navegador' })).toBeDisabled();
  });

  test('salvar no navegador gera cookie com uuid e a sessão reabre na tela de envio', async ({
    page,
    context,
  }) => {
    await analyzeAndOpenActions(page);
    await page.getByRole('button', { name: 'Salvar neste navegador' }).click();
    await expect(page.getByText(/Salvo!/)).toBeVisible();

    const cookie = (await context.cookies()).find((c) => c.name === 'sintonia_id');
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000 + 300 * 24 * 3600);

    // recarregar apaga a memória da aba; a sessão salva continua e abre de novo
    await page.goto('/pt/start/');
    const saved = page.getByTestId('saved-sessions');
    await expect(saved).toContainText('Sessões salvas');
    await saved.getByRole('button', { name: 'Abrir' }).click();
    await expect(page).toHaveURL(/\/pt\/report\/timeline\/?$/);
    await expect(page.getByText('Dados fictícios de demonstração')).toBeHidden();

    // remover tira da lista
    await page.goto('/pt/start/');
    await page
      .getByTestId('saved-sessions')
      .getByRole('button', { name: /Remover a sessão/ })
      .click();
    await expect(page.getByTestId('saved-sessions')).toBeHidden();
  });

  test('salvar duas vezes a mesma conversa não duplica; apagar tudo limpa as sessões', async ({
    page,
  }) => {
    await analyzeAndOpenActions(page);
    const save = page.getByRole('button', { name: 'Salvar neste navegador' });
    await save.click();
    await expect(page.getByText(/Salvo!/)).toBeVisible();
    await save.click();
    await expect(page.getByTestId('saved-sessions').getByRole('listitem')).toHaveCount(1);

    await page.getByRole('button', { name: 'Apagar tudo' }).click();
    await page.getByRole('button', { name: 'Sim, apagar' }).click();
    await expect(page).toHaveURL(/\/pt\/?$/);
    await page.goto('/pt/start/');
    await expect(page.getByTestId('saved-sessions')).toBeHidden();
  });

  test('o PDF é o relatório completo e é a única coisa na impressão', async ({ page }) => {
    await page.goto('/pt/report/actions/');
    await page.emulateMedia({ media: 'print' });
    const report = page.getByTestId('print-report');
    await expect(report).toBeVisible();
    await expect(report).toContainText('Ana Lima');
    await expect(report).toContainText('Bruno Reis');
    for (const text of [
      'Relatório da conversa',
      'Em destaque',
      'Notas',
      'Volume de mensagens',
      'Linha do tempo',
      'Primeira mensagem',
      'Mensagens mês a mês',
      'Tempo de resposta',
      'Horários',
      'A Pedra Filosofal',
      'Palavras só de vocês',
      'jujuba',
    ]) {
      await expect(report).toContainText(text);
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Ações' })).toBeHidden();
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(20_000);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  test('o PDF deixa de fora as palavras escondidas no painel', async ({ page }) => {
    await page.goto('/pt/report/dashboard/');
    await page
      .getByTestId('words-card')
      .getByRole('button', { name: /Esconder “jujuba”/ })
      .click();
    await page.getByRole('link', { name: 'Ações' }).first().click();
    await expect(page.getByTestId('print-report')).not.toContainText('jujuba');
  });

  test('cards para stories: 6 imagens 1080×1920 que dá para baixar', async ({ page }) => {
    await page.goto('/pt/report/actions/');
    await page.getByRole('button', { name: 'Gerar cards' }).click();
    const panel = page.getByTestId('stories-panel');
    await expect(panel.getByRole('img')).toHaveCount(6);
    const size = await panel
      .getByRole('img', { name: 'Mensagens' })
      .evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
    expect(size).toEqual([1080, 1920]);
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: /Baixar · Mensagens/ }).click();
    expect((await download).suggestedFilename()).toBe('sintonia-messages.png');
  });

  test('cards para stories abrem ampliados, passam como carrossel e baixam', async ({ page }) => {
    await page.goto('/pt/report/actions/');
    await page.getByRole('button', { name: 'Gerar cards' }).click();
    await page.getByRole('button', { name: 'Ampliar: Mensagens' }).click();
    const viewer = page.getByTestId('story-viewer');
    await expect(viewer).toContainText('Mensagens · 1/6');
    await viewer.getByRole('button', { name: 'Próximo card' }).click();
    await expect(viewer).toContainText('Quem fala mais · 2/6');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer).toContainText('Mensagens · 1/6');
    const download = page.waitForEvent('download');
    await viewer.getByRole('button', { name: 'Baixar' }).click();
    expect((await download).suggestedFilename()).toBe('sintonia-messages.png');
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
  });

  test('stories sem nomes e sem as palavras escondidas', async ({ page }) => {
    await page.goto('/pt/report/dashboard/');
    await page
      .getByTestId('words-card')
      .getByRole('button', { name: /Esconder “jujuba”/ })
      .click();
    await page.getByRole('link', { name: 'Ações' }).first().click();
    await page.getByRole('checkbox', { name: /primeiros nomes/ }).uncheck();
    await page.getByRole('button', { name: 'Gerar cards' }).click();
    await expect(page.getByTestId('stories-panel').getByRole('img')).toHaveCount(6);
    // trocar a opção com cards na tela refaz os cards
    await page.getByRole('checkbox', { name: /primeiros nomes/ }).check();
    await expect(page.getByTestId('stories-panel').getByRole('img')).toHaveCount(6);
  });
});

test('na tela Confirmar dá para trocar o nome que aparece no relatório', async ({ page }) => {
  await consentAndUpload(page, [
    'fixtures/whatsapp/android-pt.txt',
    'fixtures/telegram/result.json',
  ]);
  await expect(page).toHaveURL(/\/pt\/confirm\/?$/);
  const nameA = page.getByTestId('display-name-A');
  await expect(nameA).not.toHaveValue('');
  await nameA.fill('Aninha');
  await page.getByTestId('display-name-B').fill('  ');
  await page.getByRole('button', { name: 'Analisar' }).click();
  await expect(page).toHaveURL(/\/pt\/report\/timeline\/?$/);
  await page
    .getByRole('link', { name: /Painel/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: /Mensagens por pessoa/ })).toContainText('Aninha');
  // nome em branco volta ao detectado
  await expect(page.getByRole('button', { name: /Mensagens por pessoa/ })).toContainText('Bruno');
});
