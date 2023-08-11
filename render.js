import { COMPONENT_SYMBOL } from "./symbol.js";

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

export async function* handle(chunk) {
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
        ...chunk.properties.reduce((acc, prop) => ({...acc, [prop.name]: prop.value}), {}),
        children: chunk.children,
      })
    );
  } else {
    yield chunk.toString();
  }
}

export async function* render(template) {
  for (const chunk of template) {
    yield* handle(chunk);
  }
}

export async function renderToString(renderResult) {
  let result = "";

  for await (const chunk of render(renderResult)) {
    result += chunk;
  }

  return result;
}
