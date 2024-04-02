import { html } from './html.js';
import { render, renderToString, handle } from './render.js';
import { Await, when } from './await.js';
import { Slot } from './slot.js';
import { LitElement, css, html as litHtml } from 'lit';
import { litRenderer } from '@swtl/lit';
import { defaultRenderer } from './ssr/default.js';
import { COMPONENT_SYMBOL } from './symbol.js';
import { HtmlPage } from './demo/pages/HtmlPage.js';

class MyEl extends LitElement {
  static styles = css`:host { color: red }`
  static properties = { disabled: { type: Boolean } };
  render() {
    return litHtml`<h1>hello ${this.disabled ? 'foo' : 'bar'}</h1>`;
  }
}
customElements.define('my-el', MyEl);


// console.log(await renderToString(renderLit({
//   tag: 'my-el',
//   attributes: [{name: 'disabled', value: true}],
//   children: [`children`]
// })));

function Bar() {
  return html`<h2>bar</h2>`
}

// console.log(await renderToString(defaultRenderer({
//   tag: 'my-el',
//   attributes: [{name: 'disabled', value: true}],
//   children: [`children`,
//   {
//     fn: Bar,
//     properties: [],
//     children: [],
//     slots: {},
//     kind: COMPONENT_SYMBOL
//   }
// ]
// })));


// function Html({title}) {
//   return html`<html>${title}</html>`
// }

// function Foo({data}) {
//   return html`<h1>hi</h1>`
// }

// @TODO BUG!
// const bug2 = html`
//   <${Await} promise=${() => new Promise(r => setTimeout(() => r({foo:'foo'}), 500))}>
//     ${() => html`
//       <h2>a</h2>
//       <${Foo}/>
//     `}
//   <//>
// `

// function Foo({a}) {
//   return html`${a}`;
// }

// function Parent({slots}) {
//   console.log(slots);
//   return html`<h1>${slots?.default}</h1><h2>bar</h2>`

// }

function Foo() {
  return html`1`
}

function unwrap(generator) {
  const result = [];

  let next = generator.next();
  while(!next.done) {
    result.push(next.value);
    next = generator.next();
  }

  return result;
}

function HtmlPage2({children}) {
  return children;
}

const fixture = html`
  <${HtmlPage}>
    <h1>home</h1>
      <my-el></my-el>
    <ul>
      
    </ul>
    <h2>footer</h2>
  <//>
`

const r = unwrap(fixture);
console.log(1, r);
// console.log(JSON.stringify(r, null, 2));

// console.log(1, await renderToString(bug3));
// console.log(await renderToString(bug2));