# swtl

> Check out the [swtl-starter](https://github.com/thepassle/swtl-starter) app

A Service Worker Templating Language (`swtl`) for component-like templating in service workers. Streams templates to the browser as they're being parsed, and handles rendering iterables/Responses in templates by default. Also supports SSR/SWSRing custom elements, with a pluggable custom element renderer system.

Runs in Service Workers, but can also be used in Node, or other server-side JS environments.

```bash
npm i swtl
```

## Example

```js
import { html, Router, CacheFirst } from 'swtl';
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
      response: ({url, params, query, request}) => html`
        <${HtmlPage} title="Home">
          <h1>Home</h1>
          <nav>
            <${BreadCrumbs} path=${request.url.pathname}/>
          </nav>
          ${fetch('./some-partial.html')}
          ${caches.match('./another-partial.html')}
          <ul>
            ${['foo', 'bar', 'baz'].map(i => html`<li>${i}</li>`)}
          </ul>
          <${CacheFirst} file="./some-file.html"/>
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

Uses [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) internally for matching the `paths`. The `response` callback gets passed the native [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object, as well as any route params or query params.

```js
import { html, Router } from 'swtl';

const router = new Router({
  routes: [
    {
      path: '/',
      response: () => html`<h1>Home</h1>`
    },
    {
      path: '/:foo',
      response: ({params}) => html`<h1>${params.foo}</h1>`
    },
    {
      path: '/:foo/:bar',
      response: ({params}) => html`<h1>${params.foo}/${params.bar}</h1>`
    },
    {
      path: '/:foo/:bar',
      response: ({url, params, query, request}) => html`<h1>${params.foo}/${params.bar}</h1>`
    },
  ]
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(router.handleRequest(event.request));
  }
});
```

### `baseHref`

You can also specify a `baseHref`, for example if your app is served under a specific base route, like `https://my-app.com/foo/bar/`:

```js
const router = new Router({
  baseHref: '/foo/bar/',
  routes: [
    {
      // The url will be: https://my-app.com/foo/bar/
      path: '',
      response: () => html`<${Home}/>`
    },
    {
      // The url will be: https://my-app.com/foo/bar/users/1
      path: 'users/:id',
      response: ({params}) => html`<${User} id=${params.id}/>`
    }
  ]
});
```

Note that you also have the set the `base` tag in your HTML:
```html
<base href="/foo/bar/">
```

### `fallback`

You can also provide a fallback in case no routes are matched. If you don't provide a fallback, the request will not be handled by the service worker, and go through to the network.

```js
const router = new Router({
  routes: [
    {
      path: '/',
      response: () => html`<${Home}/>`
    }
  ],
  fallback: ({query, request}) => html`<${NotFound}/>`
});
```

### `plugins`

You can also provide plugins. You can add global plugins that will run for every route, or add plugins for specific routes only. If you return a `Response` from a plugin, the router will return that response to the browser instead of your `response` function.

```js
import { Router, html, HtmlResponse } from 'swtl';

const logger = {
  name: 'logger-plugin',
  beforeResponse({request}) {
    console.log(`Request made to ${request.url}`);
  }
}

const router = new Router({
  /**
   * These plugins run for all routes
   */
  plugins: [logger],
  routes: [
    {
      path: '/',
      response: () => html`<${Home}/>`,
      /**
       * These plugins run for this route only
       */
      plugins: [
        {
          name: 'my-plugin',
          async beforeResponse({url, query, params, request}) {
            console.log('Running [my-plugin]!');

            /**
             * Based on conditions we can return a different response
             */
            if (query.foo === 'bar') {
              return new Response('bar');
            }

            if (query.bar === 'foo') {
              /**
               * Returns a `Response` with a stream of the html template as body for convenience
               */
              return new HtmlResponse(html`<${Bar}/>`);
            }

            /**
             * We can also use plugins for redirects
             */
            if (params.user === 'frank') {
              return Response.redirect('/foo');
            }
          }
        }
      ]
    }
  ]
});
```

### `options`

You can also provide `options`, the `options` will be passed to the `Response` that `handleRequest` returns:

```js
const router = new Router({
  routes: [
    {
      path: '/foo',
      response: () => html`foo`,
      options: {
        headers: {
          'content-type': 'text/xml'
        }
      }
    }
  ],
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
function MyComponent({foo, title, baz, qux, bool}) {
  return html`
    <h1>${title}</h1>
    <div>${foo}</div>
    <div>${baz} ${qux}</div>
    <div>${bool}</div>
  `;
}

const object = {
  baz: 'hello',
  qux: 'world',
}

html`<${MyComponent} title="hello" foo=${1} ...${object} bool/>`;

/** 
 * Note that quotes are optional when using expressions, the following is also fine:
 * foo="${1}"
 * ...bar="${object}"
 */
```

### Slots

In addition to `children`, SWTL also supports `slots`, for when you need a little more flexibility for composition. You can use `slots` like so:

```js
import { Slot } from 'swtl';

function Parent({slots}) {
  return html`
    <h1>${slots.default}</h1>
    <h2>${slots.bar}</h2>
    <h3>${slots.baz}</h3>
  `;
}

html`<${Parent}>
  <${Slot}>Foo<//>
  <${Slot} name="bar">Bar<//>
  <${Slot} name="baz">Baz<//>
<//>`

// Output:
// <h1>Foo</h1>
// <h2>Bar</h2>
// <h3>Baz</h3>
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
    ${new Response('hello')}
    ${stream}
    <ul>
      ${gen()}
    </ul>
  </main>
`;
```

## Strategies

We also ship some built-in components to declaratively let you request files.

```js
import { NetworkFirst, NetworkOnly, CacheFirst, CacheOnly, html } from 'swtl';

const template = html`
  <h1>Hello world</h1>
  
  <${NetworkFirst} file="./some-file.html"/>
  <${NetworkOnly} file="./some-file.html"/>
  <${CacheFirst} file="./some-file.html"/>
  <${CacheOnly} file="./some-file.html"/>

  <footer>Copyright</footer>
`;
```

You can also provide a fallback:

```js
const template = html`
  <${NetworkFirst} file="./some-file.html">
    <div>Failed to fetch, and not in cache</div>
  <//>

  <${NetworkOnly} file="./some-file.html">
    <div>Failed to fetch</div>
  <//>

  <${CacheFirst} file="./some-file.html">
    <div>Not in cache, and failed to fetch</div>
  <//>

  <${CacheOnly} file="./some-file.html">
    <div>Not in cache</div>
  <//>
`;
```

If you're using SWTL in a more SPA-like PWA app, you can also use the following strategies:
```js
import { networkFirst, networkOnly, cacheFirst, cacheOnly } from 'swtl';

import { Router } from 'swtl';

const router = new Router({
  routes: [
    {
      path: '/images/*.svg',
      response: cacheFirst
    },
  ]
});

self.addEventListener('fetch', (event) => {
  event.respondWith(router.handleRequest(event.request));
});
```

## Out of order streaming

For out of order streaming you can use the built-in `Await` component and provide a `promise` property:

```js
import { Await, when } from 'swtl';

html`
  <${Await} promise=${() => fetch('/api/foo').then(r => r.json())}>
    ${(status, data, error) => html`
      <h1>Fetching data</h1>
      ${when(status.pending, () => html`<p>Loading...</p>`)}
      ${when(status.error, () => html`<p>Failed to fetch data</p>`)}
      ${when(status.success, () => html`
        <ul>
          ${data.map(i => html`<li>${i}</li>`)}
        </ul>
      `)}
    `}
  <//>
`
```


## Render

The `Router` streams responses to the browser via the `render` function internally in `handleRequest`:

```js
import { render } from 'swtl';

for await (const chunk of render(html`<h1>${1}</h1>`)) {
  console.log(chunk);
}
```

But we also export a `renderToString`:

```js
import { renderToString } from 'swtl';

const result = await renderToString(html`<h1>${1}</h1>`);
```

## SSR/SWSR

Swtl also supports SSR (Server Side Rendering) or SWSR (Service Worker Side Rendering) of custom elements via a pluggable custom element renderer system. Here's an example: 

```js
import { litRenderer } from '@swtl/lit';

const router = new Router({
  customElementRenderers = [litRenderer]
  // etc
})
```

> Note that `customElementRenderers` are order-sensitive; `customElementRenderers` will do a `match` check to see if the current renderer should or should not render the given custom element. If this `match` check returns false, it will defer to the next renderer (if any) or to the default renderer, which just outputs the custom element as-is, and essentially _doesn't_ SSR/SWSR it. You don't have to provide the default renderer manually; it gets added for you.

You can then use (in this case) LitElements in your SWTL template, e.g.:

```js
html`<my-lit-el .foo=${{a: 'b'}} bar="2"></my-lit-el>`
```

And the LitElement will get rendered via `@lit-labs/ssr` with Declarative Shadow Dom. If you want to hydrate your component, you'll have to explicitly load the client-side code for your component:

```js
html`
  <my-lit-el .foo=${{a: 'b'}} bar="2"></my-lit-el>
  <script type="module" src="./my-lit-el.js"/>
`
```

## Creating Custom Element Renderers

You can also create _custom_ custom element renderers (no, that's not a typo). The way this works is as follows:

Swtl's `html` tag will parse the template for SWTL Components, but also for custom elements. Given the following template:

```js
html`<my-el foo=1 disabled>foo</my-el>`
```

Internally, the following object will be created:
```js
{
  tag: 'my-el',
  children: ['foo'],
  attributes: [
    {
      name: 'foo',
      value: '1'
    },
    {
      name: 'disabled',
      value: true
    }
  ]
}
```

Custom element renderers get passed this custom element object. A custom element renderer is an object with two methods on it: `match` and `render`. Here's an example:

```js
async function* render({tag, children, attributes}, renderChildren) {
  yield `<${tag}>`;
  yield `<template shadowroot="open" shadowrootmode="open">`;
  yield `render shadow DOM`
  yield `</template>`;
  yield* renderChildren(children);
  yield `</${tag}>`;
}

export const fooRenderer = {
  name: 'foo',
  /**
   * Return a boolean to indicate if your custom renderer 
   * should render this custom element or not
   */
  match({tag, children, attributes}) {
    const ctor = customElements.get(tag);
    return ctor.isFooElement;
  },
  render
}
```

The `match` function indicates whether or not this renderer should render the custom element it gets passed. If this returns true, the `render` function will be called for this custom element. If false, it will defer to the `defaultRenderer`, which just outputs the custom element as it was authored and does not SSR/SWSR it.

The `render` function should be a generator function that yields your SSR/SWSR'd custom element.

## Acknowledgements

Inspired by libraries like [`preact/htm`](https://github.com/developit/htm) and [`lit-html`](https://github.com/lit/lit).

And [`Astro`](https://github.com/withastro/astro) for doing the hard work of implementing the rendering logic back when I requested this to be supported in Astro.

❤️