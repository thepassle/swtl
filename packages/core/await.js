import { AWAIT_SYMBOL } from './symbol.js';

/**
 * @typedef {import('./types.js').Children} Children
 * @typedef {import('./html.js').html} html
 */

/**
 * @param {{
 *  promise: () => Promise<unknown>,
 *  children: Children
 * }} args
 * @returns {{
 *  promise: () => Promise<unknown>,
 *  template: () => ReturnType<html>
 * }}
 */
function Await({promise, children}) {
  return { 
    promise, 
    template: /** @type {() => ReturnType<html>} */ (children.find(c => typeof c === 'function'))
  };
}

Await.kind = AWAIT_SYMBOL;

/**
 * 
 * @param {boolean} condition 
 * @param {() => ReturnType<html>} template 
 * @returns 
 */
const when = (condition, template) => condition ? template() : '';

export { Await, when };