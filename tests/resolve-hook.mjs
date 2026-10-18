import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC_DIR = new URL('../src/', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith(SRC_DIR) && !/\.\w+$/.test(specifier)) {
    const candidate = new URL(`${specifier}.js`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(SRC_DIR)) return nextLoad(url, { ...context, format: 'module' });
  return nextLoad(url, context);
}
