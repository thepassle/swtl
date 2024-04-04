/**
 * @typedef {import('./types.js').Children} Children
 * @typedef {{
 *  file: string,
 *  children: Children
 * }} StrategyParams
 */

/** @param {StrategyParams} params */
export const NetworkFirst = ({file, children}) => fetch(file).catch(() => caches.match(file).then(r => r || children));

/** @param {StrategyParams} params */
export const CacheFirst = ({file, children}) => caches.match(file).then(r => r || fetch(file).catch(() => children));

/** @param {StrategyParams} params */
export const CacheOnly = ({file, children}) => caches.match(file).then(r => r || children);

/** @param {StrategyParams} params */
export const NetworkOnly = ({file, children}) => fetch(file).catch(() => children);

/** @param {Request} request */
export const networkFirst = (request) => fetch(request).catch(() => caches.match(request));

/** @param {Request} request */
export const cacheFirst = (request) => caches.match(request).then(r => r || fetch(request));

/** @param {Request} request */
export const cacheOnly = (request) => caches.match(request);

/** @param {Request} request */
export const networkOnly = (request) => fetch(request);