import { SLOT_SYMBOL, COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL } from '../symbol.js';

/**
 * Prototype: push-based renderer (no generators). Chunks are written to
 * `write`; functions only return a promise when something actually is async,
 * so fully synchronous trees never touch a promise.
 * Not supported in this prototype: Await, custom (non-default) renderers.
 */

const props = (properties) => {
  const o = {};
  for (const p of properties) o[p.name] = p.value;
  return o;
};

function renderIterable(iterable, write) {
  if (iterable[Symbol.asyncIterator]) {
    return (async () => {
      for await (const c of iterable) {
        const r = handle(c, write);
        if (r) await r;
      }
    })();
  }
  const it = iterable[Symbol.iterator]();
  const step = () => {
    for (let n = it.next(); !n.done; n = it.next()) {
      const r = handle(n.value, write);
      if (r) return r.then(step);
    }
  };
  return step();
}

/** @returns {void | Promise<void>} */
function handle(chunk, write) {
  if (typeof chunk === 'string') return void write(chunk);
  if (typeof chunk === 'function') return handle(chunk(), write);
  if (Array.isArray(chunk)) return renderIterable(chunk, write);
  if (typeof chunk?.then === 'function') return chunk.then(v => handle(v, write));
  if (chunk?.[Symbol.asyncIterator] || chunk?.[Symbol.iterator]) return renderIterable(chunk, write);
  if (chunk?.kind === CUSTOM_ELEMENT_SYMBOL) {
    const { tag, children, attributes } = chunk;
    let attrs = '';
    for (let i = 0; i < attributes.length; i++) {
      const { name, value } = attributes[i];
      attrs += (typeof value === 'boolean' && value ? name : `${name}="${value}"`) + (i < attributes.length - 1 ? ' ' : '');
    }
    write(attrs.length ? `<${tag} ${attrs}>` : `<${tag}>`);
    const r = renderIterable(children, write);
    if (r) return r.then(() => void write(`</${tag}>`));
    return void write(`</${tag}>`);
  }
  if (chunk?.kind === COMPONENT_SYMBOL) {
    const children = [];
    const slots = {};
    for (const child of chunk.children) {
      if (child?.fn?.kind === SLOT_SYMBOL) {
        slots[child.properties.find(p => p.name === 'name')?.value || 'default'] = child.children;
      } else children.push(child);
    }
    const out = chunk.fn({ ...props(chunk.properties), children, slots });
    return handle(out, write);
  }
  const s = chunk?.toString();
  write(s === '[object Object]' ? JSON.stringify(chunk) : s);
}

export async function renderToStringPush(template) {
  let result = '';
  const r = renderIterable(template, c => { result += c; });
  if (r) await r;
  return result;
}

/** Same public shape as render(): an async iterable, built on a push core. */
export function renderPush(template) {
  return new ReadableStream({
    async start(controller) {
      const r = renderIterable(template, c => controller.enqueue(c));
      if (r) await r;
      controller.close();
    }
  });
}
