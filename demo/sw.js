import { Router } from '../router.js';
import { html } from '../html.js';
import { HtmlPage } from './pages/HtmlPage.js';

async function* generator() {
  let i = 0;
  while(i < 2000) {
    i++;
    yield* html`<li>${i}</li>`;
  }
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // yield* html`<li>1</li>`;
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // yield* html`<li>2</li>`;
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // yield* html`<li>3</li>`;
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // yield* html`<li>4</li>`;
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // yield* html`<li>5</li>`;
}

function Bar() {
  return html`<h2>bar</h2>`
}
function Baz({children}) {
  return html`<h3>baz ${children}</h3>`
}

const router = new Router({
  routes: [
    {
      path: '/',
      render: ({params, query, request}) => html`
        <${HtmlPage}>
          <h1>hi</h1>
          <${Baz}>foo <//>
        <//>`
    },
    {
      path: '/foo',
      render: ({params, query, request}) => html`<${HtmlPage}><h1>Foo</h1><//>`
    },
    {
      path: '/bar',
      render: ({params, query, request}) => html`<${HtmlPage}>
        <${Baz}>abc<//>
        efg
      <//>`
    },
    {
      path: '/baz',
      render: ({params, query, request}) => html`
        <${HtmlPage}>
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
          <${Baz}>abc<//>
          <h3>hello</h3>
          ${1}
        <//>
      `
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

