import { expect, test } from '@playwright/test';

import { button, navItem, openAsUser, registerViaApi, text, visible } from './helpers.mjs';

// Emotki i flagi-emotki (Windows pokazuje je jako litery "US", "EU"…).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

const themeButton = (page) => visible(page.locator('[aria-label^="Włącz tryb"]'));

async function tickNumber(page) {
  const label = await text(page, /Tick #\d+/).innerText();
  return Number(label.match(/Tick #(\d+)/)[1]);
}

test.describe('Interfejs', () => {
  test('przełącznik motywu zmienia kolory i zapamiętuje wybór', async ({ page }) => {
    await page.goto('/login');
    const card = visible(page.getByText('Witaj ponownie'));
    await expect(card).toBeVisible();
    const before = await themeButton(page).getAttribute('aria-label');
    const colorBefore = await card.evaluate((el) => getComputedStyle(el).color);

    await themeButton(page).click();
    const after = await themeButton(page).getAttribute('aria-label');
    expect(after).not.toBe(before);
    expect(await card.evaluate((el) => getComputedStyle(el).color)).not.toBe(colorBefore);

    await page.reload();
    await expect(text(page, 'Witaj ponownie')).toBeVisible();
    expect(await themeButton(page).getAttribute('aria-label')).toBe(after);
  });

  test('nawigacja i tytuły kart przeglądarki', async ({ page, request, isMobile }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token);

    if (isMobile) {
      await expect(text(page, 'Symulator rynku')).toBeHidden();
    } else {
      // Na komputerze: boczne menu z zaznaczoną aktywną pozycją.
      await expect(text(page, 'Symulator rynku')).toBeVisible();
      await expect(navItem(page, /Rynek/)).toHaveAttribute('aria-selected', 'true');
    }

    for (const [name, title] of [
      ['Portfel', 'Portfel'],
      ['Historia', 'Historia'],
      ['Profil', 'Profil'],
      ['Rynek', 'Rynek'],
    ]) {
      await navItem(page, new RegExp(name)).click();
      await expect(page).toHaveTitle(`${title} · Giełda Walut`);
    }
  });

  test('kursy zmieniają się na żywo, a pauza je zatrzymuje', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token);

    const usd = visible(page.getByRole('button', { name: /^Dolar amerykański, kurs/ }));
    const firstTick = await tickNumber(page);
    const firstRate = await usd.getAttribute('aria-label');
    await expect.poll(() => tickNumber(page), { timeout: 10_000 }).toBeGreaterThan(firstTick + 1);
    expect(await usd.getAttribute('aria-label')).not.toBe(firstRate);

    await button(page, 'Wstrzymaj symulację').click();
    await expect(text(page, 'Symulacja wstrzymana')).toBeVisible();
    const pausedTick = await tickNumber(page);
    const pausedRate = await usd.getAttribute('aria-label');
    await page.waitForTimeout(4000);
    expect(await tickNumber(page)).toBe(pausedTick);
    expect(await usd.getAttribute('aria-label')).toBe(pausedRate);

    await button(page, 'Wznów symulację').click();
    await expect.poll(() => tickNumber(page), { timeout: 10_000 }).toBeGreaterThan(pausedTick);
  });

  test('filtry wzrostów i spadków dzielą listę walut', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token);
    await button(page, 'Wstrzymaj symulację').click(); // stałe kursy na czas liczenia

    const rows = page.getByRole('button', { name: /, kurs .* złotych$/ }).filter({ visible: true });
    await expect(rows).toHaveCount(8);
    await button(page, 'Wzrosty', { exact: true }).click();
    const gainers = await rows.count();
    await button(page, 'Spadki', { exact: true }).click();
    const losers = await rows.count();
    expect(gainers + losers).toBe(8);
  });

  test('ustawienia symulacji są zapamiętywane', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token);
    await navItem(page, /Profil/).click();

    await button(page, 'Szybko', { exact: true }).click();
    await button(page, 'Burzliwy', { exact: true }).click();
    await expect(button(page, 'Szybko', { exact: true })).toHaveAttribute('aria-selected', 'true');

    await page.reload();
    await navItem(page, /Profil/).click();
    await expect(button(page, 'Szybko', { exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(button(page, 'Burzliwy', { exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(button(page, 'Normalnie', { exact: true })).toHaveAttribute('aria-selected', 'false');
  });

  test('nieznana waluta w adresie przekierowuje na rynek', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await page.addInitScript((value) => window.localStorage.setItem('gielda.token', value), token);
    await page.goto('/currency/XYZ');
    await expect(text(page, 'Kursy walut')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('brak połączenia z serwerem: ekran informacyjny i ponowna próba', async ({ page }) => {
    await page.route('**/api/health', (route) => route.abort());
    await page.goto('/');
    await expect(text(page, 'Serwer nie odpowiada')).toBeVisible();
    await expect(text(page, /npm run server/)).toBeVisible();

    await page.unroute('**/api/health');
    await button(page, 'Spróbuj ponownie').click();
    await expect(text(page, 'Witaj ponownie')).toBeVisible();
  });

  test('flagi walut to grafiki, a na stronie nie ma emotek', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token);
    await expect(page.getByRole('button', { name: /, kurs / }).filter({ visible: true })).toHaveCount(8);

    // Każdy wiersz waluty zawiera flagę (SVG), a tekst strony nie zawiera emotek.
    const rows = page.getByRole('button', { name: /, kurs / }).filter({ visible: true });
    for (let i = 0; i < 8; i++) {
      expect(await rows.nth(i).locator('svg').count()).toBeGreaterThanOrEqual(1);
    }
    for (const path of ['/', '/wallet', '/history', '/profile', '/currency/USD']) {
      await page.goto(path);
      await page.waitForTimeout(500);
      expect(await page.locator('body').innerText()).not.toMatch(EMOJI);
    }
  });

  test('w konsoli przeglądarki nie ma błędów', async ({ page, request }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      // Brak dostępu do API NBP (np. bez internetu) jest obsłużony — symulacja startuje z kursów wbudowanych.
      if (message.location().url.includes('nbp.pl') || /ERR_(TUNNEL|NAME|INTERNET|CONNECTION)/.test(message.text()))
        return;
      errors.push(message.text());
    });

    const { token } = await registerViaApi(request);
    await openAsUser(page, token);
    for (const name of ['Portfel', 'Historia', 'Profil', 'Rynek']) {
      await navItem(page, new RegExp(name)).click();
      await page.waitForTimeout(400);
    }
    await visible(page.getByRole('button', { name: /^Euro, kurs/ })).click();
    await expect(text(page, 'Złóż zlecenie')).toBeVisible();
    await themeButton(page).click();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
