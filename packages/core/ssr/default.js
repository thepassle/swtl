import { render as swtlRender } from '../render.js';
import { DEFAULT_RENDERER_SYMBOL } from '../symbol.js';

/**
 * @typedef {import('../types.js').CustomElementRenderer} CustomElementRenderer
 * @typedef {import('../types.js').HtmlResult} HtmlResult
 * @typedef {import('../types.js').HtmlValue} HtmlValue
 * @typedef {import('../types.js').Children} Children
 * @typedef {import('../types.js').Attribute} Attribute
 */

/**
 * @param {{
 *  tag: string,
 *  children: Children,
 *  attributes: Attribute[],
 *  renderers: CustomElementRenderer[]
 * }} args
 */
async function* render({ tag, children, attributes, renderers }) {
  const attrs = attributes.reduce((acc, { name, value }, index) => {
    const attribute = typeof value === 'boolean' && value ? name : `${name}="${value}"`;
    return index < attributes.length - 1 ? `${acc}${attribute} ` : `${acc}${attribute}`;
  }, '');
  yield attrs.length ? `<${tag} ${attrs}>` : `<${tag}>`;
  yield* swtlRender(children, renderers);
  yield `</${tag}>`;
}

/**
 * @type {CustomElementRenderer}
 */
export const defaultRenderer = {
  name: DEFAULT_RENDERER_SYMBOL,
  match() {
    return true;
  },
  render
}