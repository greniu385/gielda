import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getPasswordStrength, validateDisplayName, validateEmail, validatePassword } from '../src/utils/validation.js';

test('walidacja e-maila', () => {
  for (const ok of ['jan@test.pl', 'jan.kowalski+gielda@szkola.edu.pl', '  ala@kot.com  ']) {
    assert.equal(validateEmail(ok), null, ok);
  }
  assert.equal(validateEmail(''), 'Podaj adres e-mail.');
  assert.equal(validateEmail('   '), 'Podaj adres e-mail.');
  for (const bad of ['jan', 'jan@', '@test.pl', 'jan@test', 'jan @test.pl', 'jan@test.p']) {
    assert.equal(validateEmail(bad), 'Nieprawidłowy adres e-mail.', bad);
  }
});

test('walidacja hasła: min. 6 znaków i cyfra', () => {
  assert.equal(validatePassword(''), 'Podaj hasło.');
  assert.match(validatePassword('abc12'), /co najmniej 6 znaków/);
  assert.match(validatePassword('abcdefgh'), /cyfrę/);
  assert.equal(validatePassword('haslo1'), null);
});

test('walidacja nazwy użytkownika', () => {
  assert.equal(validateDisplayName(''), 'Podaj imię lub nick.');
  assert.match(validateDisplayName('A'), /co najmniej 2 znaki/);
  assert.match(validateDisplayName('x'.repeat(31)), /maksymalnie 30/);
  assert.equal(validateDisplayName('Jan Kowalski'), null);
  assert.equal(validateDisplayName('  Jo  '), null, 'spacje na brzegach nie liczą się');
});

test('siła hasła rośnie z długością i różnorodnością znaków', () => {
  assert.equal(getPasswordStrength(''), 0);
  assert.equal(getPasswordStrength('abc'), 0);
  assert.equal(getPasswordStrength('abcdef'), 1);
  assert.equal(getPasswordStrength('abcdefghij'), 2);
  assert.equal(getPasswordStrength('Abcdefghij'), 3);
  assert.equal(getPasswordStrength('Abcdefgh1!'), 4);
});
