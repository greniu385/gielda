import { expect, test } from '@playwright/test';

import {
  button,
  field,
  getPortfolio,
  getTransactions,
  goToTab,
  openAsUser,
  registerViaApi,
  text,
  visible,
} from './helpers.mjs';

// Kwota w formacie aplikacji, np. 9629.95 -> /9\s629,95\szł/ (spacje to twarde spacje).
function moneyPattern(value) {
  const [integer, fraction] = value.toFixed(2).split('.');
  return new RegExp(`${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '\\s')},${fraction}\\szł`);
}

async function placeOrder(page, { direction = 'Na wzrost', action, amount, submit }) {
  await button(page, direction, { exact: true }).click();
  await button(page, action, { exact: true }).click();
  if (amount !== undefined) await field(page, '0,00').fill(String(amount));
  await button(page, submit).click();
}

test.describe('Handel walutami', () => {
  test('kupno i sprzedaż waluty zapisują się w bazie', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token, '/currency/USD');

    await placeOrder(page, { action: 'Kup', amount: 100, submit: 'Kup USD' });
    await expect(text(page, /Kupiono 100,00 USD za/)).toBeVisible();
    let portfolio = await getPortfolio(request, token);
    expect(portfolio.balances.USD).toBe(100);
    const [buy] = await getTransactions(request, token);
    expect(portfolio.balances.PLN).toBeCloseTo(10000 - buy.total, 2);
    await expect(text(page, 'DŁUGA (NA WZROST)')).toBeVisible();

    await button(page, 'Sprzedaj', { exact: true }).click();
    await text(page, '50%', { exact: true }).click();
    await button(page, 'Sprzedaj USD').click();
    await expect(text(page, /Sprzedano 50,00 USD za/)).toBeVisible();
    portfolio = await getPortfolio(request, token);
    expect(portfolio.balances.USD).toBe(50);
    expect(portfolio.tradesCount).toBe(2);

    // Gotówka w portfelu pokazuje dokładnie to, co jest zapisane na serwerze.
    await goToTab(page, /Portfel/);
    await expect(text(page, moneyPattern(portfolio.balances.PLN))).toBeVisible();
  });

  test('kwota w złotówkach i przycisk MAX', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token, '/currency/EUR');

    await text(page, 'PLN', { exact: true }).click();
    await field(page, '0,00').fill('1000');
    await button(page, 'Kup EUR').click();
    await expect(text(page, /Kupiono .* EUR za/)).toBeVisible();
    let portfolio = await getPortfolio(request, token);
    // Za 1000 zł kupujemy pełne grosze waluty — wydajemy niewiele mniej niż 1000 zł.
    expect(portfolio.balances.PLN).toBeGreaterThanOrEqual(9000);
    expect(portfolio.balances.PLN).toBeLessThan(9000 + 5);

    await text(page, 'MAX', { exact: true }).click();
    await button(page, 'Kup EUR').click();
    await expect(text(page, /Kupiono .* EUR za/)).toBeVisible();
    portfolio = await getPortfolio(request, token);
    expect(portfolio.balances.PLN).toBeGreaterThanOrEqual(0);
    expect(portfolio.balances.PLN).toBeLessThan(5);
  });

  test('blokady: zakup ponad saldo i sprzedaż ponad stan', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token, '/currency/GBP');

    await field(page, '0,00').fill('99999');
    await expect(text(page, /Brakuje .* — masz 10\s000,00\szł/)).toBeVisible();
    await expect(button(page, 'Kup GBP')).toBeDisabled();

    await button(page, 'Sprzedaj', { exact: true }).click();
    await field(page, '0,00').fill('1');
    await expect(text(page, 'Masz tylko 0,00 GBP.')).toBeVisible();
    await expect(button(page, 'Sprzedaj GBP')).toBeDisabled();

    await button(page, 'Na spadek', { exact: true }).click();
    await field(page, '0,00').fill('99999');
    await expect(text(page, /Brakuje/)).toBeVisible();
    await expect(button(page, 'Otwórz short GBP')).toBeDisabled();

    await button(page, 'Zamknij short', { exact: true }).click();
    await field(page, '0,00').fill('1');
    await expect(text(page, 'Twoja krótka pozycja to 0,00 GBP.')).toBeVisible();
    await expect(button(page, 'Zamknij short GBP')).toBeDisabled();

    await field(page, '0,00').fill('abc');
    await expect(text(page, 'Wpisz poprawną liczbę, np. 150,50.')).toBeVisible();

    const portfolio = await getPortfolio(request, token);
    expect(portfolio.tradesCount).toBe(0);
  });

  test('gra na spadek: otwarcie, częściowe zamknięcie, portfel i historia', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token, '/currency/EUR');

    await placeOrder(page, { direction: 'Na spadek', action: 'Otwórz short', amount: 200, submit: 'Otwórz short EUR' });
    await expect(text(page, /Otwarto krótką pozycję 200,00 EUR, depozyt/)).toBeVisible();
    let portfolio = await getPortfolio(request, token);
    expect(portfolio.shorts.EUR.amount).toBe(200);
    expect(portfolio.balances.PLN).toBeCloseTo(10000 - portfolio.shorts.EUR.margin, 2);
    await expect(text(page, 'KRÓTKA (NA SPADEK)')).toBeVisible();

    await button(page, 'Zamknij short', { exact: true }).click();
    await text(page, '50%', { exact: true }).click();
    await button(page, 'Zamknij short EUR').click();
    await expect(text(page, /Zamknięto krótką pozycję 100,00 EUR/)).toBeVisible();
    portfolio = await getPortfolio(request, token);
    expect(portfolio.shorts.EUR.amount).toBe(100);

    await goToTab(page, /Portfel/);
    await expect(text(page, 'Pozycje krótkie (gra na spadek)')).toBeVisible();
    await expect(text(page, /EUR short/)).toBeVisible();

    await goToTab(page, /Historia/);
    await button(page, 'Short', { exact: true }).click();
    await expect(text(page, '2 transakcje', { exact: false })).toBeVisible();
    await expect(text(page, 'Zamknięcie short EUR')).toBeVisible();
    await expect(text(page, 'Short EUR', { exact: true })).toBeVisible();
  });

  test('reset portfela usuwa waluty, pozycje krótkie i historię', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    const headers = { Authorization: `Bearer ${token}` };
    await request.post('/api/trades', { headers, data: { type: 'buy', code: 'USD', amount: 100, rate: 3.7 } });
    await request.post('/api/trades', { headers, data: { type: 'short', code: 'CHF', amount: 100, rate: 4.6 } });

    await openAsUser(page, token);
    await goToTab(page, /Profil/);
    await button(page, 'Zresetuj portfel').click();
    await expect(text(page, 'Zresetować portfel?')).toBeVisible();
    await button(page, 'Resetuj', { exact: true }).click();
    await expect(text(page, /Portfel zresetowany/)).toBeVisible();

    await goToTab(page, /Portfel/);
    await expect(text(page, 'Nie masz jeszcze walut')).toBeVisible();
    const portfolio = await getPortfolio(request, token);
    expect(portfolio.balances).toEqual({ PLN: 10000 });
    expect(portfolio.shorts).toEqual({});
    expect(await getTransactions(request, token)).toEqual([]);
  });

  test('klawisz Enter wysyła zlecenie', async ({ page, request }) => {
    const { token } = await registerViaApi(request);
    await openAsUser(page, token, '/currency/CHF');
    await field(page, '0,00').fill('10');
    await field(page, '0,00').press('Enter');
    await expect(text(page, /Kupiono 10,00 CHF za/)).toBeVisible();
    expect((await getPortfolio(request, token)).balances.CHF).toBe(10);
    await expect(visible(page.getByPlaceholder('0,00'))).toHaveValue('');
  });
});
