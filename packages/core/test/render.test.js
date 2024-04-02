import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToString } from '../render.js';
import { html } from '../html.js';

describe('renderToString', () => {
  function Foo() {
    return html`<h1>foo</h1>`
  }

  function Bar({children}) {
    return html`<h1>${children}</h1>`
  }

  function Baz({children}) {
    return html`<h2>${children}</h2>`
  }

  it('basic', async () => {
    const result = await renderToString(html`<h1>hello</h1>`);
    assert.equal(result, '<h1>hello</h1>');
  });

  it('expressions', async () => {
    const result = await renderToString(html`<h1>hello ${1}</h1>`);
    assert.equal(result, '<h1>hello 1</h1>');
  });

  it('components', async () => {
    const result = await renderToString(html`<${Foo}/>`);
    assert.equal(result, '<h1>foo</h1>');
  });

  it('components children', async () => {
    const result = await renderToString(html`<${Bar}>bar<//>`);
    assert.equal(result, '<h1>bar</h1>');
  });

  it('falsey values', async () => {
    const result = await renderToString(html`<h1>${0}${false}</h1>`);
    assert.equal(result, '<h1>0false</h1>');
  });

  it('objects', async () => {
    const result = await renderToString(html`<h1>${{a: 2}}</h1>`);
    assert.equal(result, '<h1>{"a":2}</h1>');
  });
  
  it('components nested children', async () => {
    const result = await renderToString(html`<${Bar}><${Baz}>baz<//><//>`);
    assert.equal(result, '<h1><h2>baz</h2></h1>');
  });

  it('generator', async () => {
    function* generator() {
      yield* html`<li>1</li>`;
      yield* html`<li>2</li>`;
    }

    const result = await renderToString(html`<ul>${generator()}</ul>`);
    assert.equal(result, '<ul><li>1</li><li>2</li></ul>');
  });

  it('stream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        ['a', 'b', 'c'].forEach(s => controller.enqueue(s));
        controller.close();
      }
    });
    const result = await renderToString(html`<ul>${stream}</ul>`);
    assert.equal(result, '<ul>abc</ul>');
  });

  it('response', async () => {
    const response = new Response('<h1>hello</h1>');
    const result = await renderToString(html`<main>${response}</main>`);
    assert.equal(result, '<main><h1>hello</h1></main>');
  });

  it('Component returning response', async () => {
    function Foo() {
      return new Response('hi');
    }
    const result = await renderToString(html`<main><${Foo}/></main>`);
    assert.equal(result, '<main>hi</main>');
  });

//   // it('Async', async () => {
//   //   const result = await renderToString(html`<${Async} task=${() => new Promise(r => setTimeout(() => r({foo: 'bar'}), 100))}>
//   //     ${({state, data}) => html`
//   //       ${when(state === 'pending', () => html`[PENDING]`)}
//   //       ${when(state === 'success', () => html`[RESOLVED] ${data.foo}`)}
//   //     `}
//   //   <//>`);
//   //   console.log(result);
//   //   assert.equal(result, `<pending-task style="display: contents;" data-id="0">
//   //   [PENDING]
    
//   // </pending-task>
//   // <template data-id="0">
    
//   //   [RESOLVED] bar
//   // </template>
//   // <script>
//   //   {
//   //     let toReplace = document.querySelector('pending-task[data-id="0"]');
//   //     const template = document.querySelector('template[data-id="0"]').content.cloneNode(true);
//   //     toReplace.replaceWith(template);
//   //   }
//   // </script>`);
//   // });

  it('kitchensink', async () => {
    function Html({children}) {
      return html`<html><body>${children}</body></html>`;
    }

    function Foo({bar, baz}) {
      return html`<h2>foo ${bar} ${baz}</h2>`
    }

    const result = await renderToString(html`<${Html}><h1>welcome ${1}</h1><${Foo} bar=${1} baz="2"/><footer>copyright</footer><//>`)
    assert.equal(result, '<html><body><h1>welcome 1</h1><h2>foo 1 2</h2><footer>copyright</footer></body></html>');
  }); 
});

