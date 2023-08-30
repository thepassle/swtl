import { html } from './html.js';
import { render, renderToString } from './render.js';
import { Await, when } from './await.js';


function Html({title}) {
  return html`<html>${title}</html>`
}

function Foo({data}) {
  return html`<h1>hi</h1>`
}

// @TODO BUG!
const bug2 = html`
  <${Await} promise=${() => new Promise(r => setTimeout(() => r({foo:'foo'}), 500))}>
    ${() => html`
      <h2>a</h2>
      <${Foo}/>
    `}
  <//>
`

const bug3 = html`
  <${Await} promise=${() => new Promise(r => setTimeout(() => r({foo:'foo'}), 500))}>
    ${({pending, success, error}, data) => html`
      <${Foo} data=${data}/>
    `}
  <//>
`

// const data = 1;
// const bug4 = html`<${Foo} b=${data}/>`
// Cant have static AND dynamic in a property, it will hang and not render
// add testcase

console.log(await renderToString(bug3));
// console.log(await renderToString(bug2));