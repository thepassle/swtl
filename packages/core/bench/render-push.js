import { html } from '../html.js';
import { SLOT_SYMBOL, COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL, AWAIT_SYMBOL } from '../symbol.js';

/**
 * Prototype: push-based renderer (no generators). Chunks are written to
 * `write`; functions only return a promise when something actually is async,
 * so fully synchronous trees never touch a promise.
 * Supports <Await> + out-of-order streaming and custom element renderers
 * (new `push` contract, plus an adapter for legacy generator renderers).
 *
 * `ctx` = { write, pending }: `pending` holds in-flight Await promises that
 * are flushed out-of-order after the main pass, as the originals settle.
 */

const props = (properties) => {
  const o = {};
  for (const p of properties) o[p.name] = p.value;
  return o;
};

/**
 * Push-style default renderer. Contract: `push(el, renderChildren, write)`,
 * where renderChildren(children) writes children and returns void | Promise.
 */
export const defaultPushRenderer = {
  match: () => true,
  push({ tag, children, attributes }, renderChildren, write) {
    let attrs = '';
    for (let i = 0; i < attributes.length; i++) {
      const { name, value } = attributes[i];
      attrs += (typeof value === 'boolean' && value ? name : `${name}="${value}"`) + (i < attributes.length - 1 ? ' ' : '');
    }
    write(attrs.length ? `<${tag} ${attrs}>` : `<${tag}>`);
    const r = renderChildren(children);
    if (r) return r.then(() => void write(`</${tag}>`));
    write(`</${tag}>`);
  }
};

/** Adapter so existing async-generator renderers (`render(el, renderChildren)`) keep working. */
async function legacy(renderer, chunk, ctx) {
  const renderChildren = async function* (children) {
    const buf = [];
    const r = renderIterable(children, { ...ctx, write: c => buf.push(c) });
    if (r) await r;
    yield* buf;
  };
  for await (const c of renderer.render(chunk, renderChildren)) ctx.write(c);
}

function renderIterable(iterable, ctx) {
  if (iterable[Symbol.asyncIterator]) {
    return (async () => {
      for await (const c of iterable) {
        const r = handle(c, ctx);
        if (r) await r;
      }
    })();
  }
  const it = iterable[Symbol.iterator]();
  const step = () => {
    for (let n = it.next(); !n.done; n = it.next()) {
      const r = handle(n.value, ctx);
      if (r) return r.then(step);
    }
  };
  return step();
}

/** @returns {void | Promise<void>} */
function handle(chunk, ctx) {
  if (typeof chunk === 'string') return void ctx.write(chunk);
  if (typeof chunk === 'function') return handle(chunk(), ctx);
  if (Array.isArray(chunk)) return renderIterable(chunk, ctx);
  if (typeof chunk?.then === 'function') return chunk.then(v => handle(v, ctx));
  if (chunk instanceof Response && chunk.body) return renderStream(chunk.body, ctx);
  if (chunk?.[Symbol.asyncIterator] || chunk?.[Symbol.iterator]) return renderIterable(chunk, ctx);
  if (chunk?.fn?.kind === AWAIT_SYMBOL) {
    const { promise, template } = chunk.fn({ ...props(chunk.properties), children: chunk.children });
    const id = ctx.nextId++;
    ctx.pending.set(id, promise().then(
      data => ({ id, template: template({ pending: false, error: false, success: true }, data, null) }),
      error => {
        console.error(error.stack);
        return { id, template: template({ pending: false, error: true, success: false }, null, error) };
      }
    ));
    return renderIterable([
      `<awaiting-promise style="display: contents;" data-id="${id}">`,
      template({ pending: true, error: false, success: false }, null, null),
      `</awaiting-promise>`
    ], ctx);
  }
  if (chunk?.kind === CUSTOM_ELEMENT_SYMBOL) {
    const renderer = ctx.renderers.find(r => r.match(chunk));
    if (!renderer) return;
    if (renderer.push) return renderer.push(chunk, children => renderIterable(children, ctx), ctx.write);
    if (renderer.render) return legacy(renderer, chunk, ctx);
    return;
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
    return handle(out, ctx);
  }
  const s = chunk?.toString();
  ctx.write(s === '[object Object]' ? JSON.stringify(chunk) : s);
}

async function renderStream(stream, ctx) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      ctx.write(decoder.decode(value));
    }
  } finally {
    reader.releaseLock();
  }
}

async function run(template, write, renderers = []) {
  const ctx = { write, pending: new Map(), nextId: 0, renderers: [...renderers, defaultPushRenderer] };
  const r = renderIterable(template, ctx);
  if (r) await r;
  while (ctx.pending.size > 0) {
    const { id, template } = await Promise.race(ctx.pending.values());
    ctx.pending.delete(id);
    const r = renderIterable(html`
      <template data-id="${id.toString()}">${template}</template>
      <script>
        {
          let toReplace = document.querySelector('awaiting-promise[data-id="${id.toString()}"]');
          const template = document.querySelector('template[data-id="${id.toString()}"]').content.cloneNode(true);
          toReplace.replaceWith(template);
        }
      </script>
    `, ctx);
    if (r) await r;
  }
}

export async function renderToStringPush(template, renderers) {
  let result = '';
  await run(template, c => { result += c; }, renderers);
  return result;
}

/** Same chunks as render(), as a ReadableStream; OOO chunks flush as promises settle. */
export function renderPush(template, renderers) {
  return new ReadableStream({
    async start(controller) {
      await run(template, c => controller.enqueue(c), renderers);
      controller.close();
    }
  });
}
