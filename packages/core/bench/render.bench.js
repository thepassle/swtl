import { html } from '../html.js';
import { renderToString } from '../render.js';
import { renderToStringPush } from './render-push.js';

function Item({ children, n }) { return html`<li class="item">${n}: ${children}</li>`; }
function List({ children }) { return html`<ul>${children}</ul>`; }
function Page({ rows }) {
  return html`<main><h1>Title</h1><${List}>${rows.map(n => html`<${Item} n=${n}>row ${n}<//>`)}<//><my-el a="b" c>x</my-el></main>`;
}
const page = () => html`<${Page} rows=${Array.from({ length: 200 }, (_, i) => i)}/>`;

const a = await renderToString(page());
const b = await renderToStringPush(page());
if (a.replace(/\s+/g, '') !== b.replace(/\s+/g, '')) { console.log(a.slice(0, 300)); console.log(b.slice(0, 300)); throw new Error('output mismatch'); }

async function bench(name, fn, iters = 300) {
  for (let i = 0; i < 30; i++) await fn();
  const t = performance.now();
  for (let i = 0; i < iters; i++) await fn();
  const ms = (performance.now() - t) / iters;
  console.log(`${name.padEnd(28)} ${ms.toFixed(3)} ms/render`);
  return ms;
}
const g = await bench('async generators (current)', () => renderToString(page()));
const p = await bench('push/functions (prototype)', () => renderToStringPush(page()));
console.log(`speedup: ${(g / p).toFixed(2)}x`);
