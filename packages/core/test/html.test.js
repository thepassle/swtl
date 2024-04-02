import assert from 'node:assert';
import { describe, it } from 'node:test';
import { html } from '../html.js';
import { COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL } from '../symbol.js';

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
  describe('custom elements', () => {
    it('basic', () => {
      const result = unwrap(html`<my-el></my-el>`);
      assert.equal(result[0].tag, 'my-el');
      assert.equal(result[0].kind, CUSTOM_ELEMENT_SYMBOL);
      assert.deepEqual(result[0].attributes, []);
      assert.deepEqual(result[0].children, []);
    });

    it('no self-closing', () => {
      try {
        unwrap(html`<my-el/>`);
      } catch(e) {
        assert.equal(e.message, 'Custom elements cannot be self-closing: "my-el"');
      }
    });

    it('siblings custom elements', () => {
      const result = unwrap(html`<foo-el></foo-el><bar-el></bar-el>`);
      assert.equal(result[0].tag, 'foo-el');
      assert.equal(result[1].tag, 'bar-el');
    });

    it('siblings swtl component', () => {
      const result = unwrap(html`<foo-el></foo-el><${Foo}/>`);
      assert.equal(result[0].tag, 'foo-el');
      assert.equal(result[0].kind, CUSTOM_ELEMENT_SYMBOL);
      assert.equal(result[1].kind, COMPONENT_SYMBOL);
    });

    it('siblings text', () => {
      const result = unwrap(html`hello<foo-el></foo-el>world`);
      assert.equal(result[0], 'hello');
      assert.equal(result[1].tag, 'foo-el');
      assert.equal(result[2], 'world');
    });

    describe('attributes', () => {
      it('no quote', () => {
        const result = unwrap(html`<my-el foo=b></my-el>`);
        assert.deepEqual(result[0].attributes, [{name: 'foo', value: 'b'}]);
      });
  
      it('single quote', () => {
        const result = unwrap(html`<my-el foo='b'></my-el>`);
        assert.deepEqual(result[0].attributes, [{name: 'foo', value: 'b'}]);
      });
  
      it('double quote', () => {
        const result = unwrap(html`<my-el foo="b"></my-el>`);
        assert.deepEqual(result[0].attributes, [{name: 'foo', value: 'b'}]);
      });
  
      it('multiple char attribute', () => {
        const result = unwrap(html`<my-el foo="bar"></my-el>`);
        assert.deepEqual(result[0].attributes, [{name: 'foo', value: 'bar'}]);
      });

      it('dynamic val', () => {
        const result = unwrap(html`<my-el foo="${1}"></my-el>`);
        assert.deepEqual(result[0].attributes, [{name: 'foo', value: '1'}]);
      });

      it('boolean', () => {
        const result = unwrap(html`<my-el foo></my-el>`);
        assert.deepEqual(result[0].attributes, [{name: 'foo', value: true}]);
      });

      it('multiple attributes', () => {
        const result = unwrap(html`<my-el foo="bar" bar="baz"></my-el>`);
        assert.deepEqual(result[0].attributes, [
          {name: 'foo', value: 'bar'},
          {name: 'bar', value: 'baz'},
        ]);
      });

      it('spread', () => {
        const s = { a: 1, b: 2 };
        const result = unwrap(html`<my-el ...${s}></my-el>`);
        assert.deepEqual(result[0].attributes, [
          {name: 'a', value: 1},
          {name: 'b', value: 2},
        ]);
      });

      it('no self-closing', () => {
        try {
          unwrap(html`<my-el foo=bar/>`);
        } catch(e) {
          assert.equal(e.message, 'Custom elements cannot be self-closing: "my-el"');
        }
      });
    });

    describe('children', () => {
      it('basic', () => {
        const result = unwrap(html`<my-el>a</my-el>`);
        assert.deepEqual(result[0].children, ['a']);
      });

      it('dynamic', () => {
        const result = unwrap(html`<my-el>a ${1} b</my-el>`);
        assert.deepEqual(result[0].children, ['a ', 1, ' b']);
      });
      
      it('nested swtl component', () => {
        const result = unwrap(html`<my-el><${Foo}/></my-el>`);
        assert.equal(result[0].kind, CUSTOM_ELEMENT_SYMBOL);
        assert.equal(result[0].children[0].kind, COMPONENT_SYMBOL);
      });

      it('double nested swtl component', () => {
        const result = unwrap(html`<my-el><${Foo}><${Bar}><//><//></my-el>`);
        assert.equal(result[0].kind, CUSTOM_ELEMENT_SYMBOL);
        assert.equal(result[0].children[0].kind, COMPONENT_SYMBOL);
        assert.equal(result[0].children[0].children[0].kind, COMPONENT_SYMBOL);
      });
      
      it('nested custom element', () => {
        const result = unwrap(html`<foo-el><bar-el></bar-el></foo-el>`);
        assert.equal(result[0].kind, CUSTOM_ELEMENT_SYMBOL);
        assert.equal(result[0].children[0].kind, CUSTOM_ELEMENT_SYMBOL);
      });

      it('custom element child of swtl component', () => {
        const result = unwrap(html`<${Foo}><my-el></my-el><//>`);
        assert.equal(result[0].kind, COMPONENT_SYMBOL);
        assert.equal(result[0].children[0].kind, CUSTOM_ELEMENT_SYMBOL);
      });

      it('custom element child of swtl component with sibling', () => {
        const result = unwrap(html`<${Foo}><h1>a</h1><my-el></my-el><//>`);
        assert.equal(result[0].children[0], '<h1>a</h1>');
        assert.equal(result[0].children[1].kind, CUSTOM_ELEMENT_SYMBOL);
      });
    });
  });

  it('handles html', () => {
    const result = unwrap(html`<h1>hello</h1>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
  });

  it('handles expressions', () => {
    const result = unwrap(html`<h1>hello</h1>${1}`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.deepStrictEqual(result[1], 1);
  });

  it('handles falsey expressions', () => {
    const result = unwrap(html`<h1>hello</h1>${0}`);
    assert.deepStrictEqual(result[1], 0);
  });

  it('handles falsey expressions', () => {
    const result = unwrap(html`<h1>hello</h1>${false}`);
    assert.deepStrictEqual(result[1], false);
  });

  it('handles arrays', () => {
    const result = unwrap(html`<h1>${[1,2]}</h1>`);
    assert.deepStrictEqual(result[0], `<h1>`);
    assert.deepStrictEqual(result[1], [1,2]);
  });

  it('handles components with self-closing tag', () => {
    const result = unwrap(html`<h1>hello</h1><${Foo}/>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.deepStrictEqual(result[1].fn, Foo);
  });

  it('handles components with double slash closing tag', () => {
    const result = unwrap(html`<h1>hello</h1><${Foo}><//>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.deepStrictEqual(result[1].fn, Foo);
  });

  it('handles components with children', () => {
    const result = unwrap(html`<${Foo}><h1>hello</h1><//>`);
    assert.deepStrictEqual(result[0].children[0], `<h1>hello</h1>`);
  });

  it('handles nested components with children', () => {
    const result = unwrap(html`<${Foo}><${Bar}><h1>hello</h1><//><//>`);
    assert.deepStrictEqual(result[0].children[0].children[0], `<h1>hello</h1>`);
  });

  it('handles components with content that has double slash in it', () => {
    const result = unwrap(html`<${Foo}><iframe src="https://example.com"></iframe><//>`);
    assert.deepStrictEqual(result[0].children[0], `<iframe src="https://example.com"></iframe>`);
  });

  it('handles components with content that has double slash in it', () => {
    const result = unwrap(html`<${Foo}><a href="https://example.com">Example</a><//>`);
    assert.deepStrictEqual(result[0].children[0], `<a href="https://example.com">Example</a>`);
  });

  it('handles html after components', () => {
    const result = unwrap(html`<h1>hello</h1><${Foo}/><h2>bye</h2>`);
    assert.deepStrictEqual(result[0], `<h1>hello</h1>`);
    assert.equal(result[1].fn, Foo);
    assert.deepStrictEqual(result[2], `<h2>bye</h2>`);
  });

  it('handles components with properties and expressions', () => {
    const result = unwrap(html`<${Foo} a=${1}/>${2}`);
    assert.equal(result[0].fn, Foo);
    assert.equal(result[1], 2);
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
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: true}]);
  });

  it('boolean', () => {
    const result = unwrap(html`<${Foo} bar><//>`);
    assert.deepStrictEqual(result[0].properties, [{ name: 'bar', value: true}]);
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
  it('handles expression children', () => {
    const template = unwrap(html`<${Foo}>${1}<//>`);
    assert.deepStrictEqual(template[0].children, [1]);
  });

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

  it('handles falsey expressions in children', () => {
    const template = unwrap(html`<${Foo}><h1>hi ${0}</h1><//>`);
    assert.deepStrictEqual(template[0].children, ['<h1>hi ', 0, '</h1>']);
  });

  it('handles falsey expressions as last dynamic value', () => {
    const template = unwrap(html`<${Foo}/>${false}`);
    assert.deepStrictEqual(template[1], false);
  });

  it('handles Component children', () => {
    const template = unwrap(html`<${Foo}><${Bar}/><//>`);
    assert.deepStrictEqual(template[0].children, 
      [
        {
          fn: Bar,
          properties: [],
          children: [],
          slots: {},
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
          slots: {},
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
          slots: {},
          kind: COMPONENT_SYMBOL
        },
        {
          fn: Baz,
          properties: [],
          children: [],
          slots: {},
          kind: COMPONENT_SYMBOL
        },
      ]);
  });

  it('handles multiple Component children', () => {
    const template = unwrap(html`<${Foo}>
      <${Bar}/>
      <${Baz}/>
    <//>`);
    assert.deepStrictEqual(template.find(i => i.kind === COMPONENT_SYMBOL).children.filter(c => c.kind === COMPONENT_SYMBOL), 
      [
        {
          fn: Bar,
          properties: [],
          children: [],
          slots: {},
          kind: COMPONENT_SYMBOL
        },
        {
          fn: Baz,
          properties: [],
          children: [],
          slots: {},
          kind: COMPONENT_SYMBOL
        },
      ]);
  });
});