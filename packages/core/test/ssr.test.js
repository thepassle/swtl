import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToString } from '../render.js';
import { html } from '../html.js';


describe('ssr', () => {
  describe('default', () => {
    it('basic', async () => {
      const result = await renderToString(html`<my-el foo=1 bar>children</my-el>`);
      assert.equal(result, '<my-el foo="1" bar>children</my-el>');
    });

    it('nested swtl component', async () => {
      function Foo() {
        return html`<h1>foo</h1>`
      }
      const result = await renderToString(html`<my-el foo=1 bar><${Foo}/></my-el>`);
      assert.equal(result, '<my-el foo="1" bar><h1>foo</h1></my-el>');
    });

    it('nested custom element', async () => {
      function Foo({children}) {
        return html`<h1>${children}</h1>`
      }
      const result = await renderToString(html`<${Foo}><my-el></my-el><//>`);
      assert.equal(result, '<h1><my-el></my-el></h1>');
    });
  });
});