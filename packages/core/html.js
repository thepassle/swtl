import { COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL } from './symbol.js';

/**
 * @typedef {import('./types.js').Component} Component
 * @typedef {import('./types.js').CustomElement} CustomElement
 * @typedef {import('./types.js').HtmlResult} HtmlResult
 */

const TEXT = 'TEXT';
const COMPONENT = 'COMPONENT';
const TAG_OPEN = 'TAG_OPEN';

const NONE = 'NONE';
const PROP = 'PROP';
const CHILDREN = 'CHILDREN';

const SET_PROP = 'SET_PROP';
const PROP_VAL = 'PROP_VAL';

const customElementTagRegex = /^([a-z0-9]+-[a-z0-9-]*)/;
/** @param {string} t */
const noSelfClosing = t => `Custom elements cannot be self-closing: "${t}"`;

/**
 * @param {TemplateStringsArray} statics 
 * @param  {...unknown} dynamics 
 * @returns {HtmlResult}
 */
export function* html(statics, ...dynamics) {
  /** @type {TEXT | COMPONENT | TAG_OPEN} */
  let MODE = TEXT;
  /** @type {NONE | PROP | CHILDREN} */
  let COMPONENT_MODE = NONE;
  /** @type {SET_PROP | PROP_VAL | NONE} */
  let PROP_MODE = NONE;

  /** @type {Array<Component | CustomElement>} */
  const componentStack = [];

  /**
   * @example
   * source        = html`<h1>${1}</h1>`
   * statics       = ['<h1>','</h1>'], 
   * dynamics      = [1]
   */
  for (let i = 0; i < statics.length; i++) {
    let result = "";
    let tag = "";
    /**
     * @type {Component}
     */
    const component = {
      kind: COMPONENT_SYMBOL,
      slots: {},
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
      if (MODE === TEXT || MODE === TAG_OPEN) {
        if (
          c === "<" &&
          /**
           * @example <${Foo}>
           *           ^
           */
          !statics[i][j + 1] && typeof dynamics[i] === "function"
        ) {
          MODE = COMPONENT;
          component.fn = /** @type {Component["fn"]} */ (dynamics[i]);
          componentStack.push(component);
        } else {
          result += c;

          /**
           * @example <h1>
           *          ^
           * @example <my-el>
           *          ^
           */
          if (MODE === TEXT && c === '<') {
            tag = "";
            MODE = TAG_OPEN;
            continue;
          } else if (MODE === TAG_OPEN) {
            /**
             * @example <my-el foo="bar">
             *                ^
             * @example <my-el>
             *                ^
             * @example <h1>
             *             ^
             * @example <img alt="">
             *              ^
             */
            if (c === ' ' || c === '>' || c === '/') {
              if (customElementTagRegex.test(tag)) {
                if(c === '/') {
                  throw new Error(noSelfClosing(tag));
                }
                /**
                 * If we have any content before the start of a 
                 * custom element we need to yield it
                 */
                const [before] = result.split(`<${tag}`);

                if (before) {
                  yield before;
                }

                MODE = COMPONENT;
                COMPONENT_MODE = c === ' ' ? PROP : CHILDREN;
                if (COMPONENT_MODE === PROP) {
                  PROP_MODE = SET_PROP;
                }

                componentStack.push({
                  tag,
                  kind: CUSTOM_ELEMENT_SYMBOL,
                  attributes: [],
                  children: []
                });
                tag = "";
                result = "";
              } else {
                MODE = TEXT;
              }
            } else {
              tag += c;
            }
          }
        }
      } else if (MODE === COMPONENT) {
        if (COMPONENT_MODE === PROP) {
          const component = componentStack[componentStack.length - 1];
          const attrOrProp = component?.kind === COMPONENT_SYMBOL ? 'properties' : 'attributes';
          /** @ts-expect-error */
          const property = component?.[`${attrOrProp}`][component[`${attrOrProp}`].length - 1];
          if (PROP_MODE === SET_PROP) {
            let property = "";
            while (
              statics[i][j] !== "=" &&
              statics[i][j] !== "/" &&
              statics[i][j] !== ">" &&
              statics[i][j] !== '"' &&
              statics[i][j] !== "'" &&
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
              const component = /** @type {Component} */ (componentStack.pop());
              if (!componentStack.length) {
                result = '';
                yield component;
              }
              /**
               * @example <${Foo} foo>children</a>
               *                     ^
               */
            } else if (statics[i][j] === ">" && COMPONENT_MODE === PROP) {
              COMPONENT_MODE = CHILDREN;
              PROP_MODE = NONE;
            }

            if (property === '...') {
              /** @ts-expect-error */
              component[`${attrOrProp}`].push(...Object.entries(dynamics[i]).map(([name,value])=> ({name, value})));
            } else if (property) {
              /** @ts-expect-error */
              component[`${attrOrProp}`].push({name: property, value: true});
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
               *                          ^
               */
            } else if (!statics[i][j - 1]) {
              property.value = dynamics[i - 1];
              PROP_MODE = SET_PROP;

              if(statics[i][j] === '>') {
                PROP_MODE = NONE;
                COMPONENT_MODE = CHILDREN;
                /**
                 * @example <${Foo} bar=${1}/>
                 *                          ^
                 * Yield if we finished the component
                 * Swtl Component only, custom elements can't be self-closing
                 */
              } else if (statics[i][j] === '/' && componentStack.at(-1)?.kind === COMPONENT_SYMBOL) {
                const component = /** @type {Component} */ (componentStack.pop());
                if (!componentStack.length) {
                  PROP_MODE = NONE;
                  COMPONENT_MODE = NONE;
                  MODE = TEXT;
                  j++;
                  yield component;
                }
              }
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

              /**
               * @example <${Foo} bar=hi/>
               *                        ^
               * Yield if we finished the component
               * Swtl Component only, custom elements can't be self-closing
               */
              if (statics[i][j] === '/' && componentStack.at(-1)?.kind === COMPONENT_SYMBOL) {
                const component = /** @type {Component} */ (componentStack.pop());
                if (!componentStack.length) {
                  yield component;
                }
                /**
                 * @example <my-el bar=hi/>
                 *                       ^
                 */
              } else if (statics[i][j] === '/' && componentStack.at(-1)?.kind === CUSTOM_ELEMENT_SYMBOL) {
                // @ts-expect-error we already know its a custom element because of the symbol
                throw new Error(noSelfClosing(componentStack.at(-1)?.tag));
              } else if (statics[i][j] === '>') {
                result = "";
                COMPONENT_MODE = CHILDREN;
                PROP_MODE = NONE;
              }
            }
          }
        } else if (COMPONENT_MODE === CHILDREN) {
          const currentComponent = componentStack[componentStack.length - 1];

          /**
           * @example <${Foo}>children<//>
           *                           ^^
           */
          if (currentComponent.kind === COMPONENT_SYMBOL && statics[i][j] === "<" && statics[i][j + 1] === "/" && statics[i][j + 2] === "/") {
            if (result) {
              currentComponent.children.push(result);
              result = '';
            }

            j += 3;
            /**
             * If there are no components on the stack, this is a top level
             * component, and we can yield
             */
            const component = /** @type {Component} */ (componentStack.pop());
            if (!componentStack.length) {
              MODE = TEXT;
              COMPONENT_MODE = NONE;
              yield component;
            }
          } else if (statics[i][j] === '<' && !statics[i][j + 1] && typeof dynamics[i] === 'function') {
            /**
             * If the next child is a component, we need to push to children what we have
             */
            if (result) {
              currentComponent.children.push(result);
              result = '';
            }
            COMPONENT_MODE = PROP;
            PROP_MODE = SET_PROP;
            component.fn = /** @type {Component["fn"]} */ (dynamics[i]);
            componentStack.push(component);
          } else if (!statics[i][j+1]) {
            /**
             * @example <${Foo}><h1>hi ${2}</h1><//>
             *                  ^^^^^^^       
             */
            if (result && currentComponent) {
              result += statics[i][j];
              currentComponent.children.push(result);
            }
            /**
             * @example <my-el>hi</my-el>
             *                   ^
             */
          } else if (currentComponent.kind === CUSTOM_ELEMENT_SYMBOL && statics[i][j] === "<" && statics[i][j + 1] === "/") { 
            const closingTag = statics[i].slice(j);
            if (closingTag.startsWith(`</${currentComponent.tag}>`)) {
              if (result) {
                currentComponent.children.push(result);
                result = '';
              }
  
              j += currentComponent.tag.length + 2;
              /**
               * If there are no components on the stack, this is a top level
               * component, and we can yield
               */
              const component = /** @type {Component | CustomElement} */ (componentStack.pop());
              if (!componentStack.length) {
                MODE = TEXT;
                COMPONENT_MODE = NONE;
                yield component;
              } else {
                /**
                 * Otherwise we need to add the component to the parent's children
                 */
                const parentComponent = componentStack[componentStack.length - 1];
                if (component) {
                  parentComponent.children.push(component);                
                }
              }
            }
          } else if (statics[i][j] === '<') {
            const restOfString = statics[i].slice(j + 1);
            const match = restOfString.match(customElementTagRegex);
            if (match) {
              const tag = match[1];
              if (result) {
                currentComponent.children.push(result);
                result = '';
              }

              MODE = COMPONENT;
              if (statics[i][j + tag.length + 1] === ' ') {
                COMPONENT_MODE = PROP;
                PROP_MODE = SET_PROP;
              } else if (statics[i][j + tag.length + 1] === '>') {
                COMPONENT_MODE = CHILDREN;
              } else if (statics[i][j + tag.length + 1] === '/') {
                throw new Error(noSelfClosing(tag));
              }

              componentStack.push({
                tag: tag,
                kind: CUSTOM_ELEMENT_SYMBOL,
                attributes: [],
                children: []
              });
              /** Skip over the custom element tag */
              j += tag.length + 1;
            } else {
              result += statics[i][j];
            }
          } else {
            result += statics[i][j];
          }

        } else if (c === ">") {
          COMPONENT_MODE = CHILDREN;
        } else if (c === " ") {
          COMPONENT_MODE = PROP;
          PROP_MODE = SET_PROP;
        } else if (c === "/" && statics[i][j + 1] === ">" && componentStack.at(-1)?.kind === COMPONENT_SYMBOL) {
          MODE = TEXT;
          COMPONENT_MODE = NONE;
          /**
           * If there are no components on the stack, this is a top level
           * component, and we can yield
           */
          const component = /** @type {Component} */ (componentStack.pop());
          if (!componentStack.length) {
            result = '';
            yield component;
          }
          j++;
        } else {
          result += c;
        }
      } else {
        result += c;
      }
    }

    if (COMPONENT_MODE === CHILDREN && dynamics.length > i) {
      const currentComponent = componentStack[componentStack.length - 1];
      currentComponent.children.push(dynamics[i]);
    }

    if (result && COMPONENT_MODE !== CHILDREN) {
      yield result;
    }

    if (componentStack.length > 1 && component.fn) {
      componentStack[componentStack.length - 2].children.push(component)
    }

    // We're at the end of statics, now process dynamics if there are any
    if (dynamics.length > i && MODE !== COMPONENT) {
      yield dynamics[i];
    }
  }
}
