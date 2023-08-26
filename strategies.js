export function NetworkFirst({file}) {
  return fetch(file).catch(() => caches.match(file));
}

export function CacheFirst({file}) {
  return caches.match(file).then(r => r || fetch(file)); 
}

export function CacheOnly({file}) {
  return caches.match(file);
}

export function NetworkOnly({file}) {
  return fetch(file);
}