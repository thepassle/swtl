export function NetworkFirst({file, children}) {
  return fetch(file).catch(() => caches.match(file).then(r => r || children));
}

export function CacheFirst({file, children}) {
  return caches.match(file).then(r => r || fetch(file).catch(() => children));
}

export function CacheOnly({file, children}) {
  return caches.match(file).then(r => r || children);
}

export function NetworkOnly({file, children}) {
  return fetch(file).catch(() => children);
}