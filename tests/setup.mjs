// Pozwala uruchomić czyste moduły aplikacji (pisane pod Metro, bez rozszerzeń
// w importach) bezpośrednio w Node.js na potrzeby testów.
import { register } from 'node:module';

register('./resolve-hook.mjs', import.meta.url);
