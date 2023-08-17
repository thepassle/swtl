(() => {
  var __freeze = Object.freeze;
  var __defProp = Object.defineProperty;
  var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));

  // symbol.js
  var COMPONENT_SYMBOL = Symbol("component");

  // render.js
  function hasGetReader(obj) {
    return typeof obj.getReader === "function";
  }
  async function* streamAsyncIterator(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder("utf-8");
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          return;
        yield decoder.decode(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  async function* handleIterator(iterable) {
    if (hasGetReader(iterable)) {
      for await (const chunk of streamAsyncIterator(iterable)) {
        yield chunk;
      }
    } else {
      for await (const chunk of iterable) {
        yield chunk;
      }
    }
  }
  async function* handle(chunk) {
    if (typeof chunk === "string") {
      yield chunk;
    } else if (Array.isArray(chunk)) {
      yield* render(chunk);
    } else if (typeof chunk.then === "function") {
      const v = await chunk;
      yield* handle(v);
    } else if (chunk instanceof Response && chunk.body) {
      yield* handleIterator(chunk.body);
    } else if (chunk[Symbol.asyncIterator] || chunk[Symbol.iterator]) {
      yield* chunk;
    } else if (chunk.kind === COMPONENT_SYMBOL) {
      yield* render(
        await chunk.fn({
          ...chunk.properties.reduce((acc, prop) => ({ ...acc, [prop.name]: prop.value }), {}),
          children: chunk.children
        })
      );
    } else {
      yield chunk.toString();
    }
  }
  async function* render(template) {
    for (const chunk of template) {
      yield* handle(chunk);
    }
  }

  // router.js
  var Router = class {
    constructor({ routes }) {
      this.routes = routes.map((route) => ({
        ...route,
        urlPattern: new URLPattern({
          pathname: route.path,
          baseURL: self.location.origin,
          search: "*",
          hash: "*"
        })
      }));
    }
    async handleRequest(request) {
      const url = new URL(request.url);
      for (const route of this.routes) {
        const match = route.urlPattern.exec(url);
        if (match) {
          const query = Object.fromEntries(new URLSearchParams(request.url.search));
          const params = match?.pathname?.groups ?? {};
          const iterator = render(route.render({ query, params, request }));
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async pull(controller) {
              const { value, done } = await iterator.next();
              if (done) {
                controller.close();
              } else {
                controller.enqueue(encoder.encode(value));
              }
            }
          });
          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/html",
              "Transfer-Encoding": "chunked"
            }
          });
        }
      }
      return new Response("Not Found", { status: 404 });
    }
  };

  // html.js
  var TEXT = "TEXT";
  var COMPONENT = "COMPONENT";
  var NONE = "NONE";
  var PROP = "PROP";
  var CHILDREN = "CHILDREN";
  var SET_PROP = "SET_PROP";
  var PROP_VAL = "PROP_VAL";
  function* html(statics, ...dynamics) {
    if (!dynamics.length) {
      yield* statics;
    } else if (!dynamics.some((d) => typeof d === "function")) {
      yield* statics.reduce((acc, s, i) => [...acc, s, ...dynamics[i] ? [dynamics[i]] : []], []);
    } else {
      let MODE = TEXT;
      let COMPONENT_MODE = NONE;
      let PROP_MODE = NONE;
      const componentStack = [];
      for (let i = 0; i < statics.length; i++) {
        let result = "";
        const component = {
          kind: COMPONENT_SYMBOL,
          properties: [],
          children: [],
          fn: void 0
        };
        for (let j = 0; j < statics[i].length; j++) {
          let c = statics[i][j];
          if (MODE === TEXT) {
            if (c === "<" && /**
             * @example <${Foo}>
             *           ^
             */
            !statics[i][j + 1] && typeof dynamics[i] === "function") {
              MODE = COMPONENT;
              component.fn = dynamics[i];
              componentStack.push(component);
            } else {
              result += c;
            }
          } else if (MODE === COMPONENT) {
            if (COMPONENT_MODE === PROP) {
              const component2 = componentStack[componentStack.length - 1];
              const property = component2?.properties[component2.properties.length - 1];
              if (PROP_MODE === SET_PROP) {
                let property2 = "";
                while (statics[i][j] !== "=" && statics[i][j] !== "/" && statics[i][j] !== ">" && statics[i][j] !== '"' && statics[i][j] !== "'" && statics[i][j] !== " " && property2 !== "...") {
                  property2 += statics[i][j];
                  j++;
                }
                if (statics[i][j] === "=") {
                  PROP_MODE = PROP_VAL;
                } else if (statics[i][j] === "/" && COMPONENT_MODE === PROP) {
                  COMPONENT_MODE = NONE;
                  PROP_MODE = NONE;
                  const component3 = componentStack.pop();
                  if (!componentStack.length) {
                    result = "";
                    yield component3;
                  }
                } else if (statics[i][j] === ">" && COMPONENT_MODE === PROP) {
                  COMPONENT_MODE = CHILDREN;
                  PROP_MODE = NONE;
                }
                if (property2 === "...") {
                  component2.properties.push(...Object.entries(dynamics[i]).map(([name, value]) => ({ name, value })));
                } else if (property2) {
                  component2.properties.push({ name: property2, value: "" });
                }
              } else if (PROP_MODE === PROP_VAL) {
                if (statics[i][j] === '"' || statics[i][j] === "'") {
                  const quote = statics[i][j];
                  if (!statics[i][j + 1]) {
                    property.value = dynamics[i];
                    PROP_MODE = SET_PROP;
                  } else {
                    let val = "";
                    j++;
                    while (statics[i][j] !== quote) {
                      val += statics[i][j];
                      j++;
                    }
                    property.value = val || "";
                    PROP_MODE = SET_PROP;
                  }
                } else if (!statics[i][j - 1]) {
                  property.value = dynamics[i - 1];
                  PROP_MODE = SET_PROP;
                  if (statics[i][j] === "/") {
                    const component3 = componentStack.pop();
                    if (!componentStack.length) {
                      yield component3;
                    }
                  }
                } else {
                  let val = "";
                  while (statics[i][j] !== " " && statics[i][j] !== "/" && statics[i][j] !== ">") {
                    val += statics[i][j];
                    j++;
                  }
                  property.value = val || "";
                  PROP_MODE = SET_PROP;
                  if (statics[i][j] === "/") {
                    const component3 = componentStack.pop();
                    if (!componentStack.length) {
                      yield component3;
                    }
                  }
                }
              }
            } else if (COMPONENT_MODE === CHILDREN) {
              const currentComponent = componentStack[componentStack.length - 1];
              if (statics[i][j + 1] === "/" && statics[i][j + 2] === "/") {
                if (result) {
                  currentComponent.children.push(result);
                  result = "";
                }
                j += 3;
                const component2 = componentStack.pop();
                if (!componentStack.length) {
                  MODE = TEXT;
                  COMPONENT_MODE = NONE;
                  yield component2;
                }
              } else if (statics[i][j] === "<" && typeof dynamics[i] === "function") {
                if (result) {
                  currentComponent.children.push(result);
                  result = "";
                }
                COMPONENT_MODE = PROP;
                PROP_MODE = SET_PROP;
                component.fn = dynamics[i];
                componentStack.push(component);
              } else if (!statics[i][j + 1]) {
                if (result && dynamics[i]) {
                  result += statics[i][j];
                  currentComponent.children.push(result);
                  currentComponent.children.push(dynamics[i]);
                }
              } else {
                result += statics[i][j];
              }
            } else if (c === ">") {
              COMPONENT_MODE = CHILDREN;
            } else if (c === " ") {
              COMPONENT_MODE = PROP;
              PROP_MODE = SET_PROP;
            } else if (c === "/" && statics[i][j + 1] === ">") {
              MODE = TEXT;
              COMPONENT_MODE = NONE;
              const component2 = componentStack.pop();
              if (!componentStack.length) {
                result = "";
                yield component2;
              }
              j++;
            } else {
              result += c;
            }
          } else {
            result += c;
          }
        }
        if (result && COMPONENT_MODE !== CHILDREN) {
          yield result;
        }
        if (componentStack.length > 1 && component.fn) {
          componentStack[componentStack.length - 2].children.push(component);
        }
        if (dynamics[i] && MODE !== COMPONENT) {
          yield dynamics[i];
        }
      }
    }
  }

  // demo/pages/HtmlPage.js
  var _a;
  function HtmlPage({ children, title }) {
    return html(_a || (_a = __template(['\n    <html lang="en">\n      <head>\n        <meta charset="utf-8" />\n        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n        <meta name="Description" content="">\n        <title>', "</title>\n      </head>\n      <body>\n        ", "\n        <script>\n          let refreshing;\n          async function handleUpdate() {\n            // check to see if there is a current active service worker\n            const oldSw = (await navigator.serviceWorker.getRegistration())?.active?.state;\n\n            navigator.serviceWorker.addEventListener('controllerchange', async () => {\n              if (refreshing) return;\n\n              // when the controllerchange event has fired, we get the new service worker\n              const newSw = (await navigator.serviceWorker.getRegistration())?.active?.state;\n\n              // if there was already an old activated service worker, and a new activating service worker, do the reload\n              if (oldSw === 'activated' && newSw === 'activating') {\n                refreshing = true;\n                window.location.reload();\n              }\n            });\n          }\n\n          handleUpdate();\n        <\/script>\n      </body>\n    </html>\n  "])), title ?? "", children);
  }

  // demo/sw.js
  async function* generator() {
    let i = 0;
    while (i < 2e3) {
      i++;
      yield* html`<li>${i}</li>`;
    }
  }
  function Baz({ children }) {
    return html`<h3>baz ${children}</h3>`;
  }
  var router = new Router({
    routes: [
      {
        path: "/",
        render: ({ params, query, request }) => html`
        <${HtmlPage} title="Home">
          <h1>Home</h1>
          <ul>
            ${generator()}
          </ul>
        <//>
      `
      },
      {
        path: "/foo",
        render: ({ params, query, request }) => html`<${HtmlPage}><h1>Foo</h1><//>`
      },
      {
        path: "/bar",
        render: ({ params, query, request }) => html`<${HtmlPage}>
        <${Baz}>abc<//>
        efg
      <//>`
      },
      {
        path: "/baz",
        render: ({ params, query, request }) => html`
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
      }
    ]
  });
  self.addEventListener("install", () => {
    self.skipWaiting();
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      clients.claim().then(() => {
        self.clients.matchAll().then((clients2) => {
          clients2.forEach(
            (client) => client.postMessage({ type: "SW_ACTIVATED" })
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
})();
