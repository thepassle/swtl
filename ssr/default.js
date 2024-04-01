import { render } from '../render.js';

export async function* defaultRenderer({ tag, children, attributes }) {
  const attrs = attributes.reduce((acc, { name, value }, index) => {
    const attribute = typeof value === 'boolean' && value ? name : `${name}="${value}"`;
    return index < attributes.length - 1 ? `${acc}${attribute} ` : `${acc}${attribute}`;
  }, '');
  yield attrs.length ? `<${tag} ${attrs}>` : `<${tag}>`;
  yield* render(children);
  yield `</${tag}>`;
}
