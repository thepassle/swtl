import { Router } from '../router.js';
import { html } from '../html.js';
import { HtmlPage } from './pages/HtmlPage.js';

async function* generator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield html`<li>1</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield html`<li>2</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield html`<li>3</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield html`<li>4</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield html`<li>5</li>`;
}

const router = new Router({
  routes: [
    {
      path: '/',
      render: ({params, query, request}) => html`
        <${HtmlPage} title="Home">
          <h1>Home</h1>
          <ul>
            ${generator()}
          </ul>
        <//>
      `
    },
    {
      path: '/foo',
      render: ({params, query, request}) => html`<${HtmlPage}><h1>Foo</h1><//>`
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

