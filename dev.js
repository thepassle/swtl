import { html } from './html.js';
import { render, renderToString } from './render.js';
import { Async, when } from './async.js';

// function Async({children, task}) {
//   return { task: task(), children };
// }


function Foo({children}) {
  return html`<main>${children}</main>`
}

async function* generator() {
  await new Promise(r => setTimeout(r, 10));
  yield* html`<li>1</li>`;
  await new Promise(r => setTimeout(r, 10));
  yield* html`<li>2</li>`;
}

console.log(await renderToString(html`<${Foo}/>${0}`));


// const template = html`hii`
// console.log(await renderToString(html`a ${when(1, () => template)}`));

// function htm(statics, ...dynamics) {
//   console.log(statics, dynamics);
// }

// console.log(htm`'"${1}"'`);

// async function* generator() {
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   yield* html`<li>1</li>`;
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   yield* html`<li>2</li>`;
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   yield* html`<li>3</li>`;
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   yield* html`<li>4</li>`;
//   await new Promise(resolve => setTimeout(resolve, 1000));
//   yield* html`<li>5</li>`;
// }

// const t = html`<ul>${generator()}</ul>`;
// console.log(1, t);
// // for(const c of t) {
// //   console.log(2, c);
// // }
// // debugger;
// const r = await renderToString(t);
// console.log(9999, r);

// const r = await renderToString(html`<${Baz}>123 <${Bar}/> 789<//>`);
// console.log(r);

// const template = html`
//   <${Foo} bar="${1}"/>
//   <${Foo} bar="${2}"/>
// `;


// const r = await renderToString(template);
// console.log(r);


// console.log('\n')

// async function Bar() {
//   return html`<h2>bar</h2>`;
// }

// const stream = new ReadableStream({
//   start(controller) {
//     ['a', 'b', 'c'].forEach(s => controller.enqueue(s));
//     controller.close();
//   }
// });

// function* gen() {
//   yield 1;
//   yield 2;
//   yield 3;
// }

// console.log(await renderToString(html`
//   <main> 
//     ${stream}
//     <${Bar}/>
//     ${gen()}
//   </main>
// `));

// function Baz() {}

// html`1 <${Baz}/> 2`;

// In tests I can just add an `unwrap` function


// function* html2(statics, ...dynamics) {
//   for(let i = 0; i < statics.length; i++) {
//     yield statics[i];
//     if(dynamics[i]) {
//       yield dynamics[i];
//     }
//   }
// }

// const template = html2`1 ${2} 3`;
// const template = [1,2,3];

// for(const chunk of template) {
//   console.log(chunk);
// }



// import { Async, when, html } from 'swtl';

// html`
//   <${Async} task=${() => fetch('/api/foo').then(r => r.json())}>
//     ${({state, data, error}) => html`
//       <h2>Fetching data</h2>
//       ${when(state === 'pending', () => html`<${Spinner}/>`)}
//       ${when(state === 'error', () => html`Failed to fetch data.`)}
//       ${when(state === 'success', () => html`
//         <ul>
//           ${data.map(user => html`
//             <li>${user.name}</li>
//           `)}
//         </ul>
//       `)}
//     `}
//   <//>
// `;