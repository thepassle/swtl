import { html } from './html.js';
import { render, renderToString } from './render.js';
import { Await, when } from './await.js';
import { Slot } from './slot.js';


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

function Parent({slots}) {
  console.log(slots);
  return html`<h1>${slots?.default}</h1><h2>bar</h2>`

}

// at the end of SETTING a prop, it looks like we dont close off the COMPONENT_MODE correctly
// when handling ${2} its still on COMPONENT_MODE === CHILDREN
const bug3 = html`<${Parent}><${Slot}>hi<//><//>`

// const data = 1;
// const bug4 = html`<${Foo} b=${data}/>`
// Cant have static AND dynamic in a property, it will hang and not render
// add testcase

console.log(await renderToString(bug3));
// console.log(await renderToString(bug2));