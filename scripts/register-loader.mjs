// Pozwala uruchamiać w Node.js (serwer, testy) te same moduły z katalogu src/,
// których używa aplikacja. Metro pozwala pomijać rozszerzenia w importach
// (`import ... from './currencies'`), a Node nie — ten hook to uzupełnia.
import { register } from 'node:module';

register('./resolve-hook.mjs', import.meta.url);
