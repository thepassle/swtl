import { COMPONENT_SYMBOL } from './symbol.js';

const TEXT = 'TEXT';
const COMPONENT = 'COMPONENT';

const NONE = 'NONE';
const PROP = 'PROP';
const CHILDREN = 'CHILDREN';

const SET_PROP = 'SET_PROP';
const PROP_VAL = 'PROP_VAL';

export function* html(statics, ...dynamics) {
  /**
   * If no dynamics, just return statics
   */
  if (!dynamics.length) {
    yield* statics;
  /**
   * If no Components, just stitch statics and dynamics together
   */
  } else if (!dynamics.some(d => typeof d === 'function')) {
    yield* statics.reduce((acc, s, i) => [...acc, s, ...(dynamics.length > i ? [dynamics[i]] : [])], []);
  } else {
    let MODE = TEXT;
    let COMPONENT_MODE = NONE;
    let PROP_MODE = NONE;
  
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
            const property = component?.properties[component.properties.length - 1];
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
                const component = componentStack.pop();
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
                component.properties.push(...Object.entries(dynamics[i]).map(([name,value])=> ({name, value})));
              } else if (property) {
                component.properties.push({name: property, value: true});
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
                   */
                } else if (statics[i][j] === '/') {
                  const component = componentStack.pop();
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
                 */
                if (statics[i][j] === '/') {
                  const component = componentStack.pop();
                  if (!componentStack.length) {
                    yield component;
                  }
                }
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
                result = '';
              }
  
              j += 3;
              /**
               * If there are no components on the stack, this is a top level
               * component, and we can yield
               */
              const component = componentStack.pop();
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
              component.fn = dynamics[i];
              componentStack.push(component);
            } else if (!statics[i][j+1]) {
              /**
               * @example <${Foo}><h1>hi ${2}</h1><//>
               *                  ^^^^^^^       
               */
              if(result && currentComponent) {
                result += statics[i][j];
                currentComponent.children.push(result);
              }
            } else {
              result += statics[i][j];
            }
  
          } else if (c === ">") {
            COMPONENT_MODE = CHILDREN;
          } else if (c === " ") {
            COMPONENT_MODE = PROP;
            PROP_MODE = SET_PROP;
            /** self closing tag */
          } else if (c === "/" && statics[i][j + 1] === ">") {
            MODE = TEXT;
            COMPONENT_MODE = NONE;
            /**
             * If there are no components on the stack, this is a top level
             * component, and we can yield
             */
            const component = componentStack.pop();
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
  
      if(COMPONENT_MODE === CHILDREN && dynamics.length > i) {
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
}