import { CURRENCY_CODES } from './currencies';

// Szablony wiadomości rynkowych. `impacts` określa kierunek wpływu na kurs danej waluty
// względem złotego: 1 = waluta drożeje, -1 = waluta tanieje. Siła jest losowana w silniku.
// Klucz `ALL` oznacza wpływ na wszystkie waluty (np. wydarzenia dotyczące samego złotego).
export const NEWS_TEMPLATES = [
  { title: 'Fed podnosi stopy procentowe', description: 'Rezerwa Federalna zaskoczyła rynek — dolar wyraźnie zyskuje.', impacts: { USD: 1 } },
  { title: 'Słabe dane z rynku pracy w USA', description: 'Liczba nowych miejsc pracy poniżej oczekiwań, dolar traci.', impacts: { USD: -1 } },
  { title: 'EBC zapowiada zacieśnianie polityki', description: 'Prezes EBC sugeruje kolejne podwyżki stóp w strefie euro.', impacts: { EUR: 1 } },
  { title: 'Spowolnienie w strefie euro', description: 'Indeks PMI dla Niemiec spada najniżej od miesięcy.', impacts: { EUR: -1 } },
  { title: 'Bank Anglii zaskakuje podwyżką', description: 'Funt szterling umacnia się po decyzji BoE.', impacts: { GBP: 1 } },
  { title: 'Niepewność polityczna w Londynie', description: 'Kryzys rządowy w Wielkiej Brytanii ciąży funtowi.', impacts: { GBP: -1 } },
  { title: 'Ucieczka do bezpiecznych przystani', description: 'Inwestorzy kupują franka szwajcarskiego i jena.', impacts: { CHF: 1, JPY: 1 } },
  { title: 'SNB interweniuje na rynku walutowym', description: 'Szwajcarski bank centralny osłabia franka.', impacts: { CHF: -1 } },
  { title: 'Bank Japonii podnosi stopy', description: 'Koniec ery ultraluźnej polityki — jen mocno w górę.', impacts: { JPY: 1 } },
  { title: 'Bank Japonii utrzymuje łagodny kurs', description: 'Brak zmian w polityce BoJ rozczarowuje inwestorów.', impacts: { JPY: -1 } },
  { title: 'Ropa naftowa drożeje', description: 'Waluty surowcowe zyskują na fali wzrostów cen ropy.', impacts: { CAD: 1, NOK: 1 } },
  { title: 'Gwałtowny spadek cen ropy', description: 'Dolar kanadyjski i korona norweska pod presją.', impacts: { CAD: -1, NOK: -1 } },
  { title: 'Czeski bank centralny podnosi stopy', description: 'Korona czeska umacnia się wobec złotego.', impacts: { CZK: 1 } },
  { title: 'RPP podnosi stopy procentowe', description: 'Złoty umacnia się wobec większości walut.', impacts: { ALL: -1 } },
  { title: 'Agencja obniża rating Polski', description: 'Złoty traci, kapitał odpływa z rynku.', impacts: { ALL: 1 } },
  { title: 'Dobre dane o PKB Polski', description: 'Gospodarka rośnie szybciej od prognoz, złoty zyskuje.', impacts: { ALL: -1 } },
  { title: 'Napięcia geopolityczne w regionie', description: 'Awersja do ryzyka — dolar i frank zyskują, złoty słabnie.', impacts: { USD: 1, CHF: 1, EUR: 1 } },
];

export function expandImpacts(impacts) {
  if (impacts.ALL === undefined) return impacts;
  return Object.fromEntries(CURRENCY_CODES.map((code) => [code, impacts.ALL]));
}
