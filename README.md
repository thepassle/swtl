# swtl

A Service Worker Templating Language (`swtl`) for component-like templating in service workers. Streams templates to the browser as they're being parsed, and handles rendering iterables/Responses in templates by default.

```bash
npm i swtl
```

## Example

```js
import { Router } from 'swtl/router.js';
import { html } from 'swtl/html.js';
import { BreadCrumbs } from './BreadCrumbs.js'

function HtmlPage({children, title}) {
  return html`<html><head><title>${title}</title></head><body>${children}</body></html>`;
}

function Footer() {
  return html`<footer>Copyright</footer>`;
}

const router = new Router({
  routes: [
    {
      path: '/',
      render: ({params, query, request}) => html`
        <${HtmlPage} title="Home">
          <h1>Home</h1>
          <nav>
            <${BreadCrumbs} path=${event.request.url.pathname}/>
          </nav>
          ${fetch('./some-partial.html')}
          ${caches.match('./another-partial.html')}
          <ul>
            ${['foo', 'bar', 'baz'].map(i => html`<li>${i}</li>`)}
          </ul>
          <${Footer}/>
        <//>
      `
    },
  ]
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(router.handleRequest(event.request));
  }
});
```

## Router

Uses [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) internally for matching the `paths`. The `render` callback gets passed the native [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object, as well as any route params or query params.

```js
import { Router } from 'swtl/router.js';
import { html } from 'swtl/html.js';

const router = new Router([
  {
    path: '/',
    render: () => html`<h1>Home</h1>`
  },
  {
    path: '/:foo',
    render: ({params}) => html`<h1>${params.foo}</h1>`
  },
  {
    path: '/:foo/:bar',
    render: ({params}) => html`<h1>${params.foo}/${params.bar}</h1>`
  },
  {
    path: '/:foo/:bar',
    render: ({params, query, request}) => html`<h1>${params.foo}/${params.bar}</h1>`
  },
]);

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(router.handleRequest(event.request));
  }
});
```

## Html

### Basic usage

```js
/**
 * Children
 */
function Heading({children}) {
  return html`<h1>${children}</h1>`;
}

html`<${Heading}>Hello world<//>`

/**
 * Self-closing
 */
function Heading() {
  return html`<h1>Hello world</h1>`;
}

html`<${Heading}/>`

/**
 * Properties and spread
 */
function MyComponent({foo, title, baz, qux}) {
  return html`
    <h1>${title}</h1>
    <div>${foo}</div>
    <div>${baz} ${qux}</div>
  `;
}

const object = {
  baz: 'hello',
  qux: 'world',
}

html`<${MyComponent} title="hello" foo=${1} ...bar=${object}/>`;

/** 
 * Note that quotes are optional when using expressions, the following is also fine:
 * foo="${1}"
 * ...bar="${object}"
 */
```

### Iterables/Responses

You can also use iterables or [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)s in your templates directly

```js
const stream = new ReadableStream({
  start(controller) {
    ['a', 'b', 'c'].forEach(s => controller.enqueue(s));
    controller.close();
  }
});

function* gen() {
  yield '<li>1</li>';
  yield '<li>2</li>';
  yield '<li>3</li>';
}

const template = html`
  <main> 
    ${fetch('/some.html')}
    ${caches.match('/some.html')}
    ${stream}
    <ul>
      ${gen()}
    </ul>
  </main>
`;
```


## Render

The `Router` streams responses to the browser via the `render` function internally in `handleRequest`:

```js
import { render } from 'swtl/render.js';

for (const chunk of render(html`<h1>${1}</h1>`)) {
  console.log(chunk);
}
```

But we also export a `renderToString`:

```js
import { renderToString } from 'swtl/render.js';

const result = await renderToString(html`<h1>${1}</h1>`);
```

## Acknowledgements

Inspired by libraries like [`preact/htm`](https://github.com/developit/htm) and [`lit-html`](https://github.com/lit/lit).