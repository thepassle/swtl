import { render, renderToString } from './render.js';
import { COMPONENT_SYMBOL } from './symbol.js';

const TEXT = 'TEXT';
const COMPONENT = 'COMPONENT';

const NONE = 'NONE';
const PROP = 'PROP';
const CHILDREN = 'CHILDREN';

const SET_PROP = 'SET_PROP';
const PROP_VAL = 'PROP_VAL';

export function html(statics, ...dynamics) {
  let mode = TEXT;
  let componentMode = NONE;
  let propMode = NONE;

  const htmlResult = [];
  const componentStack = [];

  /**
   * @example
   * source        = html`<h1>${1}</h1>`
   * statics       = ['<h1>','</h1>'], 
   * dynamics      = [1]
   */
  for (let i = 0; i < statics.length; i++) {
    let result = "";
    const component = {
      kind: COMPONENT_SYMBOL,
      properties: [],
      children: [],
      fn: undefined,
    };

    /**
     * @example
     * source        = html`<h1>${1}</h1>`
     * statics       = ['<h1>','</h1>'], 
     * dynamics      = [1]
     * 
     * statics[i]    = '<h1>'
     * statics[i][j] = '<'
     */
    for (let j = 0; j < statics[i].length; j++) {
      let c = statics[i][j];
      result = result.replace(/^\s*\n\s*|\s*\n\s*$/g,'');

      if (mode === TEXT) {
        if (
          c === "<" &&
          /**
           * @example <${Foo}>
           *           ^
           */
          !statics[i][j + 1] && typeof dynamics[i] === "function"
        ) {
          mode = COMPONENT;
          component.fn = dynamics[i];
          componentStack.push(component);
        } else {
          result += c;
        }
      } else if (mode === COMPONENT) {
        if (componentMode === PROP) {
          const component = componentStack[componentStack.length - 1];
          const property = component.properties[component.properties.length - 1];
          if (propMode === SET_PROP) {
            let property = "";
            while (
              statics[i][j] !== "=" &&
              statics[i][j] !== "/" &&
              statics[i][j] !== ">" &&
              statics[i][j] !== '"' &&
              statics[i][j] !== "'" &&
              // @TODO whitespace?
              statics[i][j] !== " " &&
              property !== '...'
            ) {
              property += statics[i][j];
              j++;
            }

            /**
             * @example <${Foo} foo="bar">
             *                     ^
             */
            if (statics[i][j] === "=") {
              propMode = PROP_VAL;
              /**
               * @example <${Foo} foo/>
               *                     ^
               */
            } else if (statics[i][j] === "/" && componentMode === PROP) {
              componentMode = NONE;
              propMode = NONE;
              componentStack.pop();
              /**
               * @example <${Foo} foo>children</a>
               *                     ^
               */
            } else if (statics[i][j] === ">" && componentMode === PROP) {
              componentMode = CHILDREN;
              propMode = NONE;
            }

            if (property === '...') {
              component.properties.push(...Object.entries(dynamics[i]).map(([name,value])=> ({name, value})));
            } else if (property) {
              component.properties.push({name: property, value: ''});
            }
          } else if (propMode === PROP_VAL) {
            /**
             * @example <${Foo} bar='hi'>
             *                      ^
             * @example <${Foo} bar='${1}'>
             *                      ^
             * @example <${Foo} bar="hi">
             *                      ^
             * @example <${Foo} bar="${1}">
             *                      ^
             */
            if (statics[i][j] === '"' || statics[i][j] === "'") {
              const quote = statics[i][j];
              /**
               * @example <${Foo} bar="${1}">
               *                       ^^^^
               */
              if (!statics[i][j + 1]) {
                property.value = dynamics[i];
                propMode = SET_PROP;
              } else {
                /**
                 * @example <${Foo} bar="hi">
                 *                       ^^
                 * @example <${Foo} bar='hi'>
                 *                       ^^
                 */
                let val = '';
                j++; // account for quote
                while(statics[i][j] !== quote) {
                  val += statics[i][j];
                  j++;
                }

                property.value = val || '';
                propMode = SET_PROP;
              }
              /**
               * @example <${Foo} bar=${1}>
               *                      ^^^^
               */
            } else if (!statics[i][j - 1]) {
              property.value = dynamics[i - 1];
              propMode = SET_PROP;
            } else {
              /**
               * @example <${Foo} bar=hi>
               *                        ^
               * @example <${Foo} bar=hi/>
               *                        ^
               * @example <${Foo} bar=hi baz>
               *                        ^
               */
              let val = '';
              while(
                statics[i][j] !== ' ' &&
                statics[i][j] !== '/' &&
                statics[i][j] !== '>'
              ) {
                val += statics[i][j];
                j++;
              }

              property.value = val || '';
              propMode = SET_PROP;
            }
          }
        } else if (componentMode === CHILDREN) {
          const currentComponent = componentStack[componentStack.length - 1];

          /**
           * @example <${Foo}>children<//>
           *                           ^^
           */
          if (statics[i][j + 1] === "/" && statics[i][j + 2] === "/") {
            if (result) {
              currentComponent.children.push(result);
            }

            if (!componentStack.length) {
              mode = TEXT;
              componentMode = NONE;
            }
            componentStack.pop();
            j += 3;
          } else if (statics[i][j] === '<' && typeof dynamics[i] === 'function') {
            componentMode = PROP;
            propMode = SET_PROP;
            component.fn = dynamics[i];
            componentStack.push(component);
          } else if (!statics[i][j+1]) {
            /**
             * @example <${Foo}><h1>hi ${2}</h1><//>
             *                         ^^^^
             */
            if(result && dynamics[i]) {
              result += statics[i][j];
              currentComponent.children.push(result);
              currentComponent.children.push(dynamics[i]);
            }
          } else {
            result += statics[i][j];
          }

        } else if (c === ">") {
          componentMode = CHILDREN;
          // @TODO whitespace?
        } else if (c === " ") {
          componentMode = PROP;
          propMode = SET_PROP;
          // self closing tag
        } else if (c === "/" && statics[i][j + 1] === ">") {
          mode = TEXT;
          componentMode = NONE;
          componentStack.pop();
          j++;
        } else {
          result += c;
        }
      } else {
        result += c;
      }
    }

    if (result && componentMode !== CHILDREN) {
      htmlResult.push(result);
    }

    if (component.fn && componentMode !== CHILDREN && componentStack.length === 1) {
      htmlResult.push(component);
    } else if(componentStack.length && component.fn) {
      componentStack[componentStack.length - 2].children.push(component)
    }

    // We're at the end of statics, now process dynamics if there are any
    if (dynamics[i] && mode !== COMPONENT) {
      htmlResult.push(dynamics[i]);
    }
  }

  return htmlResult;
}

function Foo({children}) {
  return html`
    <h1>foo</h1>
    <main>${children}</main>
  `
}


console.log('\n')

async function Bar() {
  return html`<h2>bar</h2>`;
}

const stream = new ReadableStream({
  start(controller) {
    ['a', 'b', 'c'].forEach(s => controller.enqueue(s));
    controller.close();
  }
});

function* gen() {
  yield 1;
  yield 2;
  yield 3;
}

console.log(await renderToString(html`
  <main> 
    ${stream}
    <${Bar}/>
    ${gen()}
  </main>
`));