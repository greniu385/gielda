import { expect, test } from '@playwright/test';

import { PASSWORD, button, field, logout, navItem, openAsUser, registerViaApi, text, uniqueEmail } from './helpers.mjs';

test.describe('Konto użytkownika', () => {
  test('formularz rejestracji sprawdza dane', async ({ page }) => {
    await page.goto('/register');
    await button(page, 'Utwórz konto').click();
    await expect(text(page, 'Podaj imię lub nick.')).toBeVisible();
    await expect(text(page, 'Podaj adres e-mail.')).toBeVisible();
    await expect(text(page, 'Podaj hasło.')).toBeVisible();

    await field(page, 'Jan').fill('Jan');
    await field(page, 'jan.kowalski@email.pl').fill('to-nie-email');
    await field(page, 'Min. 6 znaków, w tym cyfra').fill('abcdefgh');
    await field(page, '••••••••').fill('inne');
    await button(page, 'Utwórz konto').click();
    await expect(text(page, 'Nieprawidłowy adres e-mail.')).toBeVisible();
    await expect(text(page, 'Hasło musi zawierać co najmniej jedną cyfrę.')).toBeVisible();
    await expect(text(page, 'Hasła nie są takie same.')).toBeVisible();
    // Poprawienie pola usuwa jego komunikat błędu.
    await field(page, 'jan.kowalski@email.pl').fill('jan@test.pl');
    await expect(text(page, 'Nieprawidłowy adres e-mail.')).toBeHidden();
  });

  test('rejestracja nowego konta, wylogowanie i ponowne logowanie', async ({ page }) => {
    const email = uniqueEmail('rejestracja');
    await page.goto('/register');
    await field(page, 'Jan').fill('Anna Nowak');
    await field(page, 'jan.kowalski@email.pl').fill(email);
    await field(page, 'Min. 6 znaków, w tym cyfra').fill(PASSWORD);
    await field(page, '••••••••').fill(PASSWORD);
    await expect(text(page, 'Średnie')).toBeVisible(); // 8 znaków, wielkie i małe litery, cyfra
    await button(page, 'Utwórz konto').click();

    await expect(text(page, 'Cześć, Anna')).toBeVisible();
    await expect(text(page, /10\s000,00\szł/)).toBeVisible();
    await expect(page).toHaveTitle(/Rynek · Giełda Walut/);

    await logout(page);
    await field(page, 'jan.kowalski@email.pl').fill(email);
    await field(page, '••••••••').fill(PASSWORD);
    await button(page, 'Zaloguj się').click();
    await expect(text(page, 'Cześć, Anna')).toBeVisible();
  });

  test('logowanie z błędnym hasłem i nieistniejącym kontem', async ({ page, request }) => {
    const { email } = await registerViaApi(request);
    await page.goto('/login');
    await field(page, 'jan.kowalski@email.pl').fill(email);
    await field(page, '••••••••').fill('ZleHaslo1');
    await button(page, 'Zaloguj się').click();
    await expect(text(page, 'Nieprawidłowy e-mail lub hasło.')).toBeVisible();

    await field(page, 'jan.kowalski@email.pl').fill(uniqueEmail('nie-ma'));
    await field(page, '••••••••').fill(PASSWORD);
    await button(page, 'Zaloguj się').click();
    await expect(text(page, 'Nieprawidłowy e-mail lub hasło.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('nie można założyć drugiego konta na ten sam e-mail', async ({ page, request }) => {
    const { email } = await registerViaApi(request);
    await page.goto('/register');
    await field(page, 'Jan').fill('Klon');
    await field(page, 'jan.kowalski@email.pl').fill(email.toUpperCase());
    await field(page, 'Min. 6 znaków, w tym cyfra').fill(PASSWORD);
    await field(page, '••••••••').fill(PASSWORD);
    await button(page, 'Utwórz konto').click();
    await expect(text(page, 'Konto z tym adresem e-mail już istnieje.')).toBeVisible();
  });

  test('sesja przetrwa odświeżenie strony', async ({ page, request }) => {
    const { token } = await registerViaApi(request, { displayName: 'Ola' });
    await openAsUser(page, token);
    await page.reload();
    await expect(text(page, 'Cześć, Ola')).toBeVisible();
  });

  test('nieważny token przenosi do logowania', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('gielda.token', 'zly-token'));
    await page.goto('/');
    await expect(text(page, 'Witaj ponownie')).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem('gielda.token'))).toBeNull();
  });

  test('strony aplikacji wymagają zalogowania', async ({ page }) => {
    for (const path of ['/wallet', '/history', '/profile', '/currency/USD']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('zmiana hasła w profilu', async ({ page, request }) => {
    const { token, email } = await registerViaApi(request);
    await openAsUser(page, token);
    await navItem(page, /Profil/).click();

    const passwords = page.locator('input[type=password]').filter({ visible: true });
    await passwords.nth(0).fill('ZleHaslo1');
    await passwords.nth(1).fill('NoweHaslo9');
    await passwords.nth(2).fill('NoweHaslo9');
    await button(page, 'Zmień hasło').click();
    await expect(text(page, 'Obecne hasło jest nieprawidłowe.')).toBeVisible();

    await passwords.nth(0).fill(PASSWORD);
    await button(page, 'Zmień hasło').click();
    await expect(text(page, 'Hasło zostało zmienione')).toBeVisible();

    const oldLogin = await request.post('/api/auth/login', { data: { email, password: PASSWORD } });
    expect(oldLogin.status()).toBe(401);
    const newLogin = await request.post('/api/auth/login', { data: { email, password: 'NoweHaslo9' } });
    expect(newLogin.status()).toBe(200);
  });
});
