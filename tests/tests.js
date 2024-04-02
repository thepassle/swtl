import assert from 'node:assert';
import { describe, it } from 'node:test';
import { LitElement, css, html as litHtml } from 'lit';
import { html } from '../html.js';
import { renderToString } from '../render.js';
import { litRenderer } from '../ssr/lit.js';
import { Await, when } from '../await.js';
import { Slot } from '../slot.js';
import { COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL } from '../symbol.js';
import { Router } from '../router.js';
import { defaultRenderer } from '../ssr/default.js';

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

  describe('custom element renderer', () => {
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

    describe('lit', () => {
      class FooEl extends LitElement {
        static styles = css`h1 { color: red; }`;
        static properties = { 
          disabled: { type: Boolean },
          foo: { type: String },
        };
        render() {
          return litHtml`<h1>foo: ${this.foo} ${this.disabled ? 'yyy' : 'zzz'}</h1>`;
        }
      }

      customElements.define('foo-el', FooEl);

      it('basic', async () => {
        const result = await renderToString(html`<foo-el foo="bar" disabled>children</foo-el>`, [litRenderer]);
        assert(result.includes('<foo-el>'));
        assert(result.includes('<template shadowroot="open" shadowrootmode="open">'));
        assert(result.includes('<style>h1 { color: red; }</style>'));
        assert(result.includes('yyy'));
        assert(result.includes('bar'));
        assert(result.includes('children'));
        assert(result.includes('</template>'));
        assert(result.includes('</foo-el>'));
      });

      it('nested swtl component', async () => {
        function Foo() {
          return html`<h2>Foo</h2>`
        }
        const result = await renderToString(html`<foo-el foo="bar" disabled><${Foo}/></foo-el>`, [litRenderer]);
        assert(result.includes('<foo-el>'));
        assert(result.includes('<template shadowroot="open" shadowrootmode="open">'));
        assert(result.includes('<style>h1 { color: red; }</style>'));
        assert(result.includes('yyy'));
        assert(result.includes('bar'));
        assert(result.includes('<h2>Foo</h2>'));
        assert(result.includes('</template>'));
        assert(result.includes('</foo-el>'));
      });

      it('property', async () => {
        class PropertyEl extends LitElement {
          static properties = { foo: { type: Object } };
          render() {
            return litHtml`<h1>${this.foo.a}</h1>`;
          }
        }
        customElements.define('property-el', PropertyEl);
        const result = await renderToString(html`<property-el .foo=${{a: 'zzz'}}></property-el>`, [litRenderer]);
        assert(result.includes('zzz'));
      });
    });

    it('supports multiple renderers', async () => {
      class A extends LitElement {
        render() {
          return litHtml`<h1>lit</h1>`
        }
      }
      customElements.define('lit-el', A);

      const result = await renderToString(html`<lit-el></lit-el><html-el></html-el>`, [litRenderer, defaultRenderer]);
      assert(result.includes('<lit-el><template shadowroot'));
      assert(result.includes('<html-el></html-el>'));
    });
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


globalThis.URLPattern = class URLPattern {
  exec() {
    return true;
  }
}

describe('Router', () => {
  it('creates a default response', async () => {
    const router = new Router({
      routes: [
      {
        path: '/foo',
        render: () => html`foo`
      }
    ]});

    const response = await router.handleRequest({url: 'https://example.com/foo'});
    const result = await response.text();
    assert.equal(result, 'foo');
    
    assert.equal(response.headers.get('Content-Type'), 'text/html');
    assert.equal(response.headers.get('Transfer-Encoding'), 'chunked');
  });

  it('can override defaults via `options`', async () => {
    const router = new Router({
      routes: [
      {
        path: '/foo',
        render: () => html`foo`,
        options: {
          status: 300,
          headers: {
            'Content-Type': 'foo'
          }
        }
      }
    ]});

    const response = await router.handleRequest({url: 'https://example.com/foo'});
    
    assert.equal(response.status, 300);
    assert.equal(response.headers.get('Content-Type'), 'foo');
  });
});