// Pomocnicze funkcje do testów end-to-end.
import { expect } from '@playwright/test';

export const PASSWORD = 'Haslo123';

let counter = 0;
export function uniqueEmail(prefix = 'tester') {
  counter += 1;
  return `${prefix}.${Date.now()}.${process.pid}.${counter}@test.pl`;
}

// Nawigacja w aplikacji zostawia poprzednie ekrany w drzewie strony (ukryte),
// dlatego zawsze szukamy tylko widocznych elementów.
export const visible = (locator) => locator.filter({ visible: true }).first();
export const button = (page, name, options = {}) => visible(page.getByRole('button', { name, ...options }));
export const text = (page, value, options) => visible(page.getByText(value, options));
export const field = (page, placeholder) => visible(page.getByPlaceholder(placeholder));

// Zakładka nawigacji: boczne menu (komputer) albo dolny pasek (telefon).
export function navItem(page, name) {
  return visible(page.getByRole('tab', { name }).or(page.getByRole('link', { name })));
}

// Przejście do zakładki. Na telefonie ekran waluty przykrywa dolny pasek — najpierw "Wróć".
export async function goToTab(page, name) {
  if (!(await navItem(page, name).isVisible())) await button(page, 'Wróć').click();
  await navItem(page, name).click();
}

// Zakłada konto przez API (szybciej niż przez formularz) i zwraca token sesji.
export async function registerViaApi(request, { displayName = 'Jan Tester', email = uniqueEmail() } = {}) {
  const response = await request.post('/api/auth/register', {
    data: { displayName, email, password: PASSWORD },
  });
  expect(response.status()).toBe(201);
  const { token, user } = await response.json();
  return { token, user, email };
}

// Otwiera aplikację jako zalogowany użytkownik (token zapisany tak jak robi to aplikacja).
export async function openAsUser(page, token, path = '/') {
  await page.addInitScript((value) => window.localStorage.setItem('gielda.token', value), token);
  await page.goto(path);
  await expect(visible(page.getByText('WARTOŚĆ PORTFELA').or(page.getByText('Złóż zlecenie')))).toBeVisible();
}

export async function getPortfolio(request, token) {
  const response = await request.get('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).portfolio;
}

export async function getTransactions(request, token) {
  const response = await request.get('/api/transactions', { headers: { Authorization: `Bearer ${token}` } });
  return (await response.json()).transactions;
}

// Zamienia tekst kwoty z aplikacji (np. "1 234,56 zł") na liczbę.
export function parseMoney(value) {
  return Number(value.replace(/[^\d,-]/g, '').replace(',', '.'));
}

export async function logout(page) {
  await navItem(page, /Profil/).click();
  await button(page, 'Wyloguj się').click();
  await button(page, 'Wyloguj', { exact: true }).click();
  await expect(text(page, 'Witaj ponownie')).toBeVisible();
}
