import { render as swtlRender } from '../render.js';
import { DEFAULT_RENDERER_SYMBOL } from '../symbol.js';

async function* render({ tag, children, attributes }) {
  const attrs = attributes.reduce((acc, { name, value }, index) => {
    const attribute = typeof value === 'boolean' && value ? name : `${name}="${value}"`;
    return index < attributes.length - 1 ? `${acc}${attribute} ` : `${acc}${attribute}`;
  }, '');
  yield attrs.length ? `<${tag} ${attrs}>` : `<${tag}>`;
  yield* swtlRender(children);
  yield `</${tag}>`;
}

export const defaultRenderer = {
  name: DEFAULT_RENDERER_SYMBOL,
  match() {
    return true;
  },
  render
}