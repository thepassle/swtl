import { html } from './html.js';
import { AWAIT_SYMBOL, COMPONENT_SYMBOL } from "./symbol.js";

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

export async function* handle(chunk, promises) {
  if (typeof chunk === "string") {
    yield chunk;
  } else if (Array.isArray(chunk)) {
    yield* _render(chunk, promises);
  } else if (typeof chunk.then === "function") {
    const v = await chunk;
    yield* handle(v, promises);
  } else if (chunk instanceof Response && chunk.body) {
    yield* handleIterator(chunk.body);
  } else if (chunk[Symbol.asyncIterator] || chunk[Symbol.iterator]) {
    yield* _render(chunk, promises);
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
          template: template({state: 'success', data}) 
        }))
        .catch(error => ({
          id,
          template: template({state: 'error', error}) 
        }))
    );
    yield* _render(html`<awaiting-promise style="display: contents;" data-id="${id.toString()}">${template({state: 'pending'})}</awaiting-promise>`, promises);
  } else if (chunk.kind === COMPONENT_SYMBOL) {
    yield* _render(
      await chunk.fn({
        ...chunk.properties.reduce((acc, prop) => ({...acc, [prop.name]: prop.value}), {}),
        children: chunk.children,
      }),
      promises
    );
  } else {
    yield chunk.toString();
  }
}

async function* _render(template, promises) {
  for await (const chunk of template) {
    yield* handle(chunk, promises);
  }
}

export async function* render(template) {
  let promises = [];

  yield* _render(template, promises);

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

export async function renderToString(renderResult) {
  let result = "";

  for await (const chunk of render(renderResult)) {
    result += chunk;
  }

  return result;
}
