import { render, renderToString } from './render.js';

const TEXT = 0;
const COMPONENT = 1;

const NONE = 2;
const PROP = 3;
const CHILDREN = 4;

const SET_PROP = 5;
const PROP_VAL = 6;

const COMPONENT_SYMBOL = Symbol("component");

export function html(statics, ...dynamics) {
  // console.log(statics, dynamics);

  let mode = TEXT;
  let componentMode = NONE;
  let propMode = NONE;

  const htmlResult = [];

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
        } else {
          result += c;
        }
      } else if (mode === COMPONENT) {
        if (componentMode === PROP) {
          const component = htmlResult[htmlResult.length - 1];
          const property =
            component.properties[component.properties.length - 1];

          if (propMode === SET_PROP) {
            let property = "";
            while (
              statics[i][j] !== "=" &&
              statics[i][j] !== "/" &&
              statics[i][j] !== ">" &&
              statics[i][j] !== '"' &&
              statics[i][j] !== "'" &&
              // @TODO whitespace
              statics[i][j] !== " "
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
              /**
               * @example <${Foo} foo>children</a>
               *                     ^
               */
            } else if (statics[i][j] === ">" && componentMode === PROP) {
              componentMode = CHILDREN;
              propMode = NONE;
              j++;
            }

            if (property) {
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
          /**
           * @example <${Foo}>children<//>
           *                           ^^
           */
          if (statics[i][j + 1] === "/" && statics[i][j + 2] === "/") {
            mode = TEXT;
            // @TODO this index may be off
            j += 3;
          } 
          console.log('children');
          console.log(statics[i][j]);
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
          j++;
        } else {
          result += c;
        }
      } else {
        result += c;
      }
    }

    // something like this maybe?
    //. but this wont work if its a nested component?
    // const output = componentMode === CHILDREN ? htmlResult[htmlResult.length - 1].children : htmlResult;
    // Maybe store the most recent component? 

    if (result) {
      htmlResult.push(result);
    }

    if (component.fn) {
      htmlResult.push(component);
    }

    // We're at the end of statics, now process dynamics if there are any
    if (dynamics[i] && mode !== COMPONENT) {
      if (Array.isArray(dynamics[i])) {
        htmlResult.push(dynamics[i].join(""));
      } else {
        htmlResult.push(dynamics[i].toString());
      }
    }
  }

  console.log('\n\n\n')
  console.log(999, htmlResult);
  console.log(999, htmlResult[0]?.properties);
  return htmlResult;
}

function Foo() {}
function Bar() {
  return html`<h2>world</h2>`
}

const template = html`<${Foo}><h2>hi</h2><//>`;
// const template = html`<${Foo}/><h2>hi</h2>`;