import './dom-shim.js';
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { getElementRenderer } from "@lit-labs/ssr/lib/element-renderer.js";

/**
 * @typedef {import('swtl').CustomElementRenderer} CustomElementRenderer
 * @typedef {import('swtl').HtmlResult} HtmlResult
 * @typedef {import('swtl').HtmlValue} HtmlValue
 * @typedef {import('swtl').Children} Children
 * @typedef {import('swtl').Attribute} Attribute
 */

/**
 * @param {{
 *  tag: string,
 *  children: Children,
 *  attributes: Attribute[],
 * }} args
 * @param {(children: Children) => AsyncGenerator<string, void, unknown>} renderChildren
 */
async function* render({ tag, children, attributes }, renderChildren) {
  const renderInfo = {
    elementRenderers: [LitElementRenderer],
    customElementInstanceStack: [],
    customElementHostStack: [],
    deferHydration: false,
  };
  const renderer = getElementRenderer(renderInfo, tag);
  attributes.forEach(({ name, value }) => {
    if (name.startsWith('.')) {
      renderer.setProperty(name.slice(1), value);
    } else {
      renderer.attributeChangedCallback(name, null, /** @type {string} */ (value));
    }
  });
  renderer.connectedCallback();

  yield `<${tag}>`;
  yield `<template shadowroot="open" shadowrootmode="open">`;
  // @ts-expect-error
  yield* renderer.renderShadow(renderInfo);
  yield `</template>`;
  yield* renderChildren(children);
  yield `</${tag}>`;
}

/** @type {CustomElementRenderer} */
export const litRenderer = {
  name: 'lit',
  match({tag}) {
    const ctor = customElements.get(tag);
    if (!ctor) return false;
    return LitElementRenderer.matchesClass(ctor);
  },
  render
}