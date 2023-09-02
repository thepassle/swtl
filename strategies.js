import { html } from './html.js';

export function NetworkFirst({file, children}) {
  return html`${fetch(file).catch(() => caches.match(file).then(r => r || children))}`;
}

export function CacheFirst({file, children}) {
  return html`${caches.match(file).then(r => r || fetch(file).catch(() => children))}`;
}

export function CacheOnly({file, children}) {
  return html`${caches.match(file).then(r => r || children)}`;
}

export function NetworkOnly({file, children}) {
  return html`${fetch(file).catch(() => children)}`;
}