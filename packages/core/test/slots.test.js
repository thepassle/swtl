import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Slot } from '../slot.js';
import { html } from '../html.js';
import { renderToString } from '../render.js';

describe('slots', () => {
  function Default({slots}) {
    return html`<h1>${slots.default}</h1>`;
  }

  function OnlyNamed({slots}) {
    return html`<h1>${slots?.foo}</h1>`;
  }

  function DefaultAndNamed({slots}) {
    return html`<h1>${slots?.default}</h1><h2>${slots?.foo}</h2>`;
  }

  function MultipleNamed({slots}) {
    return html`<h1>${slots?.foo}</h1><h2>${slots?.bar}</h2>`;
  }

  it('default', async () => {
    const result = await renderToString(html`<${Default}><${Slot}>hi<//><//>`);
    assert.equal(result, '<h1>hi</h1>');  
  });

  it('default and named', async () => {
    const result = await renderToString(html`<${DefaultAndNamed}><${Slot}>hi<//><${Slot} name="foo">foo<//><//>`);
    assert.equal(result, '<h1>hi</h1><h2>foo</h2>');  
  });

  it('multiple named', async () => {
    const result = await renderToString(html`<${MultipleNamed}><${Slot} name="foo">foo<//><${Slot} name="bar">bar<//><//>`);
    assert.equal(result, '<h1>foo</h1><h2>bar</h2>');  
  });
  
  it('only named', async () => {
    const result = await renderToString(html`<${OnlyNamed}><${Slot} name="foo">foo<//><//>`);
    assert.equal(result, '<h1>foo</h1>');  
  });
});