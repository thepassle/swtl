import { html } from '../html.js';
import { renderToString } from '../render.js';
import { renderToStringPush, renderPush } from './render-push.js';

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

// --- Await / out-of-order ---
import { Await } from '../await.js';
import { render } from '../render.js';
const sleep = (ms, v) => () => new Promise(r => setTimeout(() => r(v), ms));
const fail = ms => () => new Promise((_, r) => setTimeout(() => r(new Error('boom')), ms));
const tpl = word => ({ pending }, data) => pending ? html`<p>loading ${word}</p>` : html`<p>${data}</p>`;
const oooPage = () => html`<main><h1>t</h1>
  <${Await} promise=${sleep(30, 'slow')}>${tpl('slow')}<//>
  <${Await} promise=${sleep(5, 'fast')}>${tpl('fast')}<//>
  </main>`;
const collect = async it => { const o = []; for await (const c of it) o.push(c); return o; };
const norm = xs => xs.join('').replace(/\s+/g, '');
const origOut = await collect(render(oooPage()));
const pushOut = await collect(renderPush(oooPage()));
if (norm(origOut) !== norm(pushOut)) { console.log(norm(origOut)); console.log(norm(pushOut)); throw new Error('OOO output mismatch'); }
const j = norm(pushOut);
if (!(j.indexOf('loadingslow') < j.indexOf('>fast<') && j.indexOf('>fast<') < j.indexOf('>slow<'))) throw new Error('OOO order wrong');
console.log('Await/OOO output identical to current renderer; fast resolves before slow');

// nested Await + rejected promise (prototype only; see notes in PR)
const edge = norm(await collect(renderPush(html`<main>
  <${Await} promise=${sleep(5, 'a')}>${({ pending }, d) => pending ? 'l' : html`${d}<${Await} promise=${sleep(5, 'b')}>${({ pending }, d) => pending ? 'n' : d}<//>`}<//>
  <${Await} promise=${fail(1)}>${({ pending, error }) => pending ? 'l' : error ? html`<b>err</b>` : ''}<//>
</main>`)));
const ids = [...edge.matchAll(/<templatedata-id="(\d+)"/g)].map(m => m[1]);
if (new Set(ids).size !== ids.length || ids.length !== 3 || !edge.includes('<b>err</b>')) throw new Error('edge case failed: ' + edge);
console.log('nested Await + rejected promise: 3 templates, unique ids, error template rendered');

// async-render timing
const asyncPage = () => html`<main>${Array.from({ length: 50 }, (_, i) => html`<${Await} promise=${sleep(0, i)}>${tpl('x')}<//>`)}</main>`;
await bench('Await x50 (current)', async () => { await renderToString(asyncPage()); }, 50);
await bench('Await x50 (prototype)', async () => { await renderToStringPush(asyncPage()); }, 50);

// --- html(): generator vs plain function ---
import { htmlArray } from './html-array.js';
const bigTpl = h => h`<main><h1>Title</h1><${List}>${Array.from({ length: 200 }, (_, n) => h`<${Item} n=${n}>row ${n}<//>`)}<//><my-el a="b" c>x</my-el></main>`;
const drain = r => { let n = 0; for (const _ of r) n++; return n; };
if (drain(bigTpl(html)) !== drain(bigTpl(htmlArray))) throw new Error('html chunk count mismatch');
const strs = await renderToStringPush(bigTpl(htmlArray));
if (norm([strs]) !== norm([a])) throw new Error('htmlArray render mismatch');
await bench('full: gen html + gen render', () => renderToString(bigTpl(html)));
await bench('full: gen html + push render', () => renderToStringPush(bigTpl(html)));
await bench('full: array html + push render', () => renderToStringPush(bigTpl(htmlArray)));

// --- custom element renderers ---
import { CUSTOM_ELEMENT_SYMBOL } from '../symbol.js';
const legacyR = { name: 'x', match: c => c.tag === 'my-el', async *render({ tag, children }, rc) { yield `<${tag} data-legacy>`; yield* rc(children); yield `</${tag}>`; } };
const pushR = { match: c => c.tag === 'my-el', push({ tag, children }, rc, w) { w(`<${tag} data-legacy>`); const r = rc(children); return r ? r.then(() => void w(`</${tag}>`)) : void w(`</${tag}>`); } };
const ce = () => html`<div><my-el a="1">hi <my-el>inner</my-el><${Item} n=${1}>x<//></my-el></div>`;
const gOut = await renderToString(ce(), [legacyR]);
const lOut = await renderToStringPush(ce(), [legacyR]);
const pOut = await renderToStringPush(ce(), [pushR]);
if (gOut !== lOut || lOut !== pOut) { console.log(gOut, '\n', lOut, '\n', pOut); throw new Error('custom renderer mismatch'); }
console.log('custom renderers: legacy gen (current), legacy via adapter, and push all identical');
const manyCe = () => html`<div>${Array.from({ length: 200 }, (_, i) => html`<my-el a=${i}>child ${i}</my-el>`)}</div>`;
await bench('custom el: legacy gen, current', () => renderToString(manyCe(), [legacyR]));
await bench('custom el: legacy gen, adapter', () => renderToStringPush(manyCe(), [legacyR]));
await bench('custom el: push renderer', () => renderToStringPush(manyCe(), [pushR]));
