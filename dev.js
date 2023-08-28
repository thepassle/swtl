import { html } from './html.js';
import { render, renderToString } from './render.js';
import { Await, when } from './await.js';


function Html({title}) {
  return html`<html>${title}</html>`
}

// @TODO BUG!
const bug2 = html`<${Html} title="blog ${2}"/>`
// Cant have static AND dynamic in a property, it will hang and not render
// add testcase

console.log(await renderToString(bug2));
// console.log(await renderToString(bug2));
