import assert from 'node:assert';
import { describe, it } from 'node:test';
import { html } from '../html.js';
import { COMPONENT_SYMBOL } from '../symbol.js';

function Foo() {}
function Bar() {
  return html`<h2>bar</h2>`;
}
function Baz() {
  return html`<h2>baz</h2>`;
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

describe('parsing', () => {
  it('handles html', () => {
    const result = unwrap(html`<h1>hello</h1>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
  });

  it('handles expressions', () => {
    const result = unwrap(html`<h1>hello</h1>${1}`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.deepStrictEqual(result[1], 1);
  });

  it('handles arrays', () => {
    const result = unwrap(html`<h1>${[1,2]}</h1>`);
    assert.deepStrictEqual(result[0], `<h1>`);
    assert.deepStrictEqual(result[1], [1,2]);
  });

  it('handles components', () => {
    const result = unwrap(html`<h1>hello</h1><${Foo}/>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.deepStrictEqual(result[1].fn, Foo);
  });

  it('handles html after components', () => {
    const result = unwrap(html`<h1>hello</h1><${Foo}/><h2>bye</h2>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.equal(result[1].fn, Foo);
    assert.deepStrictEqual(result[2], `<h2>bye</h2>`);
  });
});

describe('properties', () => {
  it('strings double quote', () => {
    const result = unwrap(html`<${Foo} bar="1"/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}]);
  });

  it('strings single quote', () => {
    const result = unwrap(html`<${Foo} bar='1'/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}]);
  });

  it('without quotes', () => {
    const result = unwrap(html`<${Foo} bar=1/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}]);
  });

  it('dynamic expressions with double quotes', () => {
    const result = unwrap(html`<${Foo} bar="${1}"/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: 1}]);
  });

  it('dynamic expressions with single quotes', () => {
    const result = unwrap(html`<${Foo} bar='${1}'/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: 1}]);
  });

  it('dynamic expressions without quotes', () => {
    const result = unwrap(html`<${Foo} bar=${1}/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: 1}]);
  });

  it('boolean', () => {
    const result = unwrap(html`<${Foo} bar/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: ''}]);
  });

  it('spread', () => {
    const result = unwrap(html`<${Foo} ...${{a: 1, b: 2}}/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'a', value: 1}, {name: 'b', value: 2}]);
  });

  it('spread and regular string', () => {
    const result = unwrap(html`<${Foo} ...${{a: 1, b: 2}} bar="baz"/>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'a', value: 1}, {name: 'b', value: 2}, {name: 'bar', value: 'baz'}]);
  });

  describe('multiple', () => {
    it('strings double quote', () => {
      const result = unwrap(html`<${Foo} bar="1" foo="2"/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}, {name:'foo', value: '2'}]);
    });

    it('strings single quote', () => {
      const result = unwrap(html`<${Foo} bar='1' foo='2'/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}, {name:'foo', value: '2'}]);
    });

    it('without quotes', () => {
      const result = unwrap(html`<${Foo} bar=1 foo=2/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}, {name:'foo', value: '2'}]);
    });

    it('without quotes dynamic static', () => {
      const result = unwrap(html`<${Foo} bar=${1} foo=2/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: 1}, {name:'foo', value: '2'}]);
    });

    it('without quotes static dynamic', () => {
      const result = unwrap(html`<${Foo} bar=1 foo=${2}/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}, {name:'foo', value: 2}]);
    });

    it('with quotes static dynamic', () => {
      const result = unwrap(html`<${Foo} bar="1" foo="${2}"/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: '1'}, {name:'foo', value: 2}]);
    });

    it('with quotes dynamic static', () => {
      const result = unwrap(html`<${Foo} bar="${1}" foo="2"/>`);
      assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: 1}, {name:'foo', value: '2'}]);
    });
  });
});

describe('children', () => {
  it('handles string children', () => {
    const template = unwrap(html`<${Foo}><h1>hi</h1><//>`);
    assert.deepStrictEqual(template[0].children, ['<h1>hi</h1>']);
  });

  it('handles string children', () => {
    const template = unwrap(html`<${Foo}><h1>hi</h1><//>`);
    assert.deepStrictEqual(template[0].children, ['<h1>hi</h1>']);
  });

  it('handles string children with expressions', () => {
    const template = unwrap(html`<${Foo}><h1>hi ${2}</h1><//>`);
    assert.deepStrictEqual(template[0].children, ['<h1>hi ', 2, '</h1>']);
  });

  it('handles string children with expressions', () => {
    const template = unwrap(html`<${Foo}><h1>hi ${2}</h1><//>`);
    assert.deepStrictEqual(template[0].children, ['<h1>hi ', 2, '</h1>']);
  });

  it('handles Component children', () => {
    const template = unwrap(html`<${Foo}><${Bar}/><//>`);
    assert.deepStrictEqual(template[0].children, 
      [
        {
          fn: Bar,
          properties: [],
          children: [],
          kind: COMPONENT_SYMBOL
        }
      ]);
  });

  it('handles Component children with closing tag', () => {
    const template = unwrap(html`<${Foo}><${Bar}><//><//>`);
    assert.deepStrictEqual(template[0].children, 
      [
        {
          fn: Bar,
          properties: [],
          children: [],
          kind: COMPONENT_SYMBOL
        }
      ]);
  });

  it('handles sibling Component children', () => {
    const template = unwrap(html`<${Foo}><${Bar}/><${Baz}/><//>`);
    assert.deepStrictEqual(template[0].children, 
      [
        {
          fn: Bar,
          properties: [],
          children: [],
          kind: COMPONENT_SYMBOL
        },
        {
          fn: Baz,
          properties: [],
          children: [],
          kind: COMPONENT_SYMBOL
        },
      ]);
  });

  it('handles multiple Component children', () => {
    const template = unwrap(html`<${Foo}>
      <${Bar}/>
      <${Baz}/>
    <//>`);
    assert.deepStrictEqual(template.find(i => i.kind === COMPONENT_SYMBOL).children, 
      [
        {
          fn: Bar,
          properties: [],
          children: [],
          kind: COMPONENT_SYMBOL
        },
        {
          fn: Baz,
          properties: [],
          children: [],
          kind: COMPONENT_SYMBOL
        },
        '\n    '
      ]);
  });
});