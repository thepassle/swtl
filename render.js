import { html } from './html.js';
import { defaultRenderer } from './ssr/default.js';
import { SLOT_SYMBOL, AWAIT_SYMBOL, COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL } from "./symbol.js";

function hasGetReader(obj) {
  return typeof obj.getReader === "function";
}

export async function* streamAsyncIterator(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
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

export async function* handle(chunk, promises, customElementRenderer) {
  // debugger;
  if (typeof chunk === "string") {
    yield chunk;
  } else if (typeof chunk === "function") {
    yield* handle(chunk(), promises, customElementRenderer);
  } else if (Array.isArray(chunk)) {
    yield* _render(chunk, promises, customElementRenderer);
  } else if (typeof chunk?.then === "function") {
    const v = await chunk;
    yield* handle(v, promises, customElementRenderer);
  } else if (chunk instanceof Response && chunk.body) {
    yield* handleIterator(chunk.body);
  } else if (chunk?.[Symbol.asyncIterator] || chunk?.[Symbol.iterator]) {
    yield* _render(chunk, promises, customElementRenderer);
  } else if (chunk?.fn?.kind === AWAIT_SYMBOL) {
    const { promise, template } = chunk.fn({
      ...chunk.properties.reduce((acc, prop) => ({...acc, [prop.name]: prop.value}), {}),
      children: chunk.children,
    });
    const id = promises.length;
    promises.push(
      promise()
        .then(data => ({
          id,
          template: template({pending: false, error: false, success: true}, data, null) 
        }))
        .catch(error => {
          console.error(error.stack);
          return {
            id,
            template: template({pending: false, error: true, success: false}, null, error) 
          }
        })
    );
    yield* _render([
      `<awaiting-promise style="display: contents;" data-id="${id.toString()}">`,
      template({pending: true, error: false, success: false}, null, null),
      `</awaiting-promise>`
    ], promises, customElementRenderer);
  } else if (chunk?.kind === CUSTOM_ELEMENT_SYMBOL) {
    yield* customElementRenderer(chunk);
  } else if (chunk?.kind === COMPONENT_SYMBOL) {
    const children = [];
    const slots = {};
    for (const child of chunk.children) {
      if (child?.fn?.kind === SLOT_SYMBOL) {
        const name = child.properties.find(prop => prop.name === 'name')?.value || 'default';
        slots[name] = child.children;
      } else {
        children.push(child);
      }
    }

    yield* handle(
      await chunk.fn({
        ...chunk.properties.reduce((acc, prop) => ({...acc, [prop.name]: prop.value}), {}),
        children,
        slots
      }),
      promises,
      customElementRenderer
    );
  } else {
    const stringified = chunk?.toString();
    if(stringified === '[object Object]') {
      yield JSON.stringify(chunk);
    } else {
      yield stringified;
    }
  }
}

async function* _render(template, promises, customElementRenderer) {
  for await (const chunk of template) {
    yield* handle(chunk, promises, customElementRenderer);
  }
}

export async function* render(template, customElementRenderer = defaultRenderer) {
  let promises = [];

  yield* _render(template, promises, customElementRenderer);

  promises = promises.map(promise => {
    let p = promise.then(val => {
      promises.splice(promises.indexOf(p), 1);
      return val;
    });
    return p;
  });

  while (promises.length > 0) {
    const nextPromise =  await Promise.race(promises);
    const { id, template } = nextPromise;

    yield* render(html`
      <template data-id="${id.toString()}">${template}</template>
      <script>
        {
          let toReplace = document.querySelector('awaiting-promise[data-id="${id.toString()}"]');
          const template = document.querySelector('template[data-id="${id.toString()}"]').content.cloneNode(true);
          toReplace.replaceWith(template);
        }
      </script>
    `)
  }
}

export async function renderToString(renderResult, customElementRenderer = defaultRenderer) {
  let result = "";

  for await (const chunk of render(renderResult, customElementRenderer)) {
    result += chunk;
  }

  return result;
}
