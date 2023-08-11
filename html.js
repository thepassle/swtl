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
  /**
   * If no dynamics, just return statics
   */
  if (!dynamics.length) {
    return statics;
  /**
   * If no Components, just stitch statics and dynamics together
   */
  } else if (!dynamics.some(d => typeof d === 'function')) {
    return statics.reduce((acc, s, i) => [...acc, s, ...(dynamics[i] ? [dynamics[i]] : [])], []);
  }

  let MODE = TEXT;
  let COMPONENT_MODE = NONE;
  let PROP_MODE = NONE;

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

      if (MODE === TEXT) {
        if (
          c === "<" &&
          /**
           * @example <${Foo}>
           *           ^
           */
          !statics[i][j + 1] && typeof dynamics[i] === "function"
        ) {
          MODE = COMPONENT;
          component.fn = dynamics[i];
          componentStack.push(component);
        } else {
          result += c;
        }
      } else if (MODE === COMPONENT) {
        if (COMPONENT_MODE === PROP) {
          const component = componentStack[componentStack.length - 1];
          const property = component.properties[component.properties.length - 1];
          if (PROP_MODE === SET_PROP) {
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
              PROP_MODE = PROP_VAL;
              /**
               * @example <${Foo} foo/>
               *                     ^
               */
            } else if (statics[i][j] === "/" && COMPONENT_MODE === PROP) {
              COMPONENT_MODE = NONE;
              PROP_MODE = NONE;
              componentStack.pop();
              /**
               * @example <${Foo} foo>children</a>
               *                     ^
               */
            } else if (statics[i][j] === ">" && COMPONENT_MODE === PROP) {
              COMPONENT_MODE = CHILDREN;
              PROP_MODE = NONE;
            }

            if (property === '...') {
              component.properties.push(...Object.entries(dynamics[i]).map(([name,value])=> ({name, value})));
            } else if (property) {
              component.properties.push({name: property, value: ''});
            }
          } else if (PROP_MODE === PROP_VAL) {
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
                PROP_MODE = SET_PROP;
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
                PROP_MODE = SET_PROP;
              }
              /**
               * @example <${Foo} bar=${1}>
               *                      ^^^^
               */
            } else if (!statics[i][j - 1]) {
              property.value = dynamics[i - 1];
              PROP_MODE = SET_PROP;
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
              PROP_MODE = SET_PROP;
            }
          }
        } else if (COMPONENT_MODE === CHILDREN) {
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
              MODE = TEXT;
              COMPONENT_MODE = NONE;
            }
            componentStack.pop();
            j += 3;
          } else if (statics[i][j] === '<' && typeof dynamics[i] === 'function') {
            COMPONENT_MODE = PROP;
            PROP_MODE = SET_PROP;
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
          COMPONENT_MODE = CHILDREN;
          // @TODO whitespace?
        } else if (c === " ") {
          COMPONENT_MODE = PROP;
          PROP_MODE = SET_PROP;
          // self closing tag
        } else if (c === "/" && statics[i][j + 1] === ">") {
          MODE = TEXT;
          COMPONENT_MODE = NONE;
          componentStack.pop();
          j++;
        } else {
          result += c;
        }
      } else {
        result += c;
      }
    }

    if (result && COMPONENT_MODE !== CHILDREN) {
      htmlResult.push(result);
    }

    if (component.fn && COMPONENT_MODE !== CHILDREN && componentStack.length === 1) {
      htmlResult.push(component);
    } else if(componentStack.length && component.fn) {
      componentStack[componentStack.length - 2].children.push(component)
    }

    // We're at the end of statics, now process dynamics if there are any
    if (dynamics[i] && MODE !== COMPONENT) {
      htmlResult.push(dynamics[i]);
    }
  }

  return htmlResult;
}



// function Foo({bar}) {
//   return html`
//     <h1>foo ${bar}</h1>
//   `
// }

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

function unwrap(generator) {
  const result = [];

  let next = generator.next();
  while(!next.done) {
    result.push(next.value);
    next = generator.next();
  }

  return result;
}

function* html2(statics, ...dynamics) {
  for(let i = 0; i < statics.length; i++) {
    yield statics[i];
    if(dynamics[i]) {
      yield dynamics[i];
    }
  }
}

// const template = html2`1 ${2} 3`;
const template = [1,2,3];

for(const chunk of template) {
  console.log(chunk);
}