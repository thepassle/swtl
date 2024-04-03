/**
 * @typedef {import('./types.js').Children} Children
 * @typedef {{
 *  file: string,
 *  children: Children
 * }} StrategyParams
 */

/** @param {StrategyParams} params */
export function NetworkFirst({file, children}) {
  return fetch(file).catch(() => caches.match(file).then(r => r || children));
}

/** @param {StrategyParams} params */
export function CacheFirst({file, children}) {
  return caches.match(file).then(r => r || fetch(file).catch(() => children));
}

/** @param {StrategyParams} params */
export function CacheOnly({file, children}) {
  return caches.match(file).then(r => r || children);
}

/** @param {StrategyParams} params */
export function NetworkOnly({file, children}) {
  return fetch(file).catch(() => children);
}