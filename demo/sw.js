import { Router } from '../router.js';
import { html } from '../html.js';

function HtmlPage({children}) {
  return html`<html><body>${children}</body></html>`
}

const router = new Router({
  routes: [
    {
      path: '/',
      render: () => html`<${HtmlPage}><h1>Home</h1><//>`
    },
    {
      path: '/foo',
      render: () => html`<${HtmlPage}><h1>Foo</h1><//>`
    },
  ]
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "SW_ACTIVATED" })
        );
      });
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(router.handleRequest(event.request));
  }
});

