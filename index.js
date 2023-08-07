const TEXT = 0;
const COMPONENT = 1;

const NONE = 2;
const ATTR = 3;
const CHILDREN = 4;

const SET_ATTR = 5;
const ATTR_VAL = 6;

const COMPONENT_SYMBOL = Symbol("component");

function html(statics, ...dynamics) {
  // console.log(statics, dynamics);

  let mode = TEXT;
  let componentMode = NONE;
  let attrMode = NONE;

  const htmlResult = [];

  for (let i = 0; i < statics.length; i++) {
    let result = "";
    const component = {
      kind: COMPONENT_SYMBOL,
      properties: [],
      fn: undefined,
    };

    for (let j = 0; j < statics[i].length; j++) {
      let c = statics[i][j];

      if (mode === TEXT) {
        if (c === "<") {
          /**
           * @example <${Foo}>
           *           ^
           */
          if (!statics[i][j + 1] && typeof dynamics[i] === "function") {
            mode = COMPONENT;
            component.fn = dynamics[i];

            /**
             * @example <${Foo}>children<//>
             *                           ^^
             */
            // @TODO this should maybe move to mode === COMPONENT, because its only relevant there
          } else if (statics[i][j + 1] === "/" && statics[i][j + 2] === "/") {
            mode = TEXT;
            j += 3;
          } else {
            result += c;
          }
        } else {
          result += c;
        }
      } else if (mode === COMPONENT) {
        if (componentMode === ATTR) {
          const component = htmlResult[htmlResult.length - 1];
          const property =
            component.properties[component.properties.length - 1];

          if (attrMode === SET_ATTR) {
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
              attrMode = ATTR_VAL;
              /**
               * @example <${Foo} foo/>
               *                     ^
               */
            } else if (statics[i][j] === "/" && componentMode === ATTR) {
              componentMode = NONE;
              attrMode = NONE;
              /**
               * @example <${Foo} foo>children</a>
               *                     ^
               */
            } else if (statics[i][j] === ">" && componentMode === ATTR) {
              componentMode = CHILDREN;
              attrMode = NONE;
              j++;
            }

            if (property) {
              component.properties.push({name: property});
            }
          } else if (attrMode === ATTR_VAL) {
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
                attrMode = SET_ATTR;
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

                if (val) { 
                  property.value = val;
                }
                attrMode = SET_ATTR;
              }
              /**
               * @example <${Foo} bar=${1}>
               *                      ^^^^
               */
            } else if (!statics[i][j - 1]) {
              property.value = dynamics[i - 1];
              attrMode = SET_ATTR;
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

              if(val) {
                property.value = val;
                attrMode = SET_ATTR;
              }
            }
          }
        } else if (componentMode === CHILDREN) {
          console.log('children');
          console.log(statics[i][j]);
        } else if (c === ">") {
          componentMode = CHILDREN;
          // @TODO whitespace?
        } else if (c === " ") {
          componentMode = ATTR;
          attrMode = SET_ATTR;
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

const template = html`<${Foo}><h2>hi</h2><//>`;
// const template = html`<${Foo}/><h2>hi</h2>`;
