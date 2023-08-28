import { HtmlResponse, Router } from '../router.js';
import { html } from '../html.js';
import { HtmlPage } from './pages/HtmlPage.js';
import { Await, when } from '../await.js';

async function* generator() {
  // let i = 0;
  // while(i < 2000) {
  //   i++;
  //   yield* html`<li>${i}</li>`;
  // }
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield* html`<li>1</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield* html`<li>2</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield* html`<li>3</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield* html`<li>4</li>`;
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield* html`<li>5</li>`;
}

function Bar({foo}) {
  return html`<h2>hi</h2>`
}
function Baz({children}) {
  return html`<h3>baz ${children}</h3>`
}

const router = new Router({
  fallback: () => html`not found!`,
  plugins: [
    {
      name: 'test',
      async beforeResponse({request, query, params}) {
        console.log(1, 'global-plugin', request, query, params);
      }
    }
  ],
  routes: [
    {
      path: '/a',
      render: () => html`a`,
      plugins: [
        {
          name: 'a-plugin',
          async beforeResponse({request, query, params}) {
            console.log(2, 'a-plugin', request, query, params);
            return new HtmlResponse(html`hi`);
            // return Response.redirect('/b');
          }
        }
      ]
    },
    {
      path: '/b',
      render: () => html`b`,
      plugins: [
        {
          name: 'b-plugin',
          async beforeResponse({request, route}) {
            console.log(3, 'b-plugin', request, route);
          }
        }
      ]
    },
    {
      path: '/',
      render: ({params, query, request}) => html`
        <${HtmlPage}>
          <h1>home</h1>
          <ul>
            <li>
              <${Await} promise=${() => new Promise(r => setTimeout(() => r({foo:'foo'}), 3000))}>
                ${({state, data}) => html`
                  ${when(state === 'pending', () => html`[PENDING] slow`)}
                  ${when(state === 'success', () => html`[RESOLVED] slow`)}
                `}
              <//>
            </li>
            <li>
              <${Await} promise=${() => new Promise(r => setTimeout(() => r({bar:'bar'}), 1500))}>
                ${({state, data}) => html`
                  ${when(state === 'pending', () => html`[PENDING] fast`)}
                  ${when(state === 'success', () => html`[RESOLVED] fast`)}
                `}
              <//>
            </li>
          </ul>
          <h2>footer</h2>
        <//>
      `
    },
    {
      path: '/foo',
      render: ({params, query, request}) => html`<${HtmlPage}><h1>Foo</h1><//>`
    },
    // {
    //   path: '/bar',
    //   render: ({params, query, request}) => html`<${HtmlPage}>
    //     <${Baz}>abc<//>
    //     efg
    //   <//>`
    // },
    // {
    //   path: '/baz',
    //   render: ({params, query, request}) => html`
    //     <${HtmlPage}>
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //       <${Baz}>abc<//>
    //       <h3>hello</h3>
    //       ${1}
    //     <//>
    //   `
    // },
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

