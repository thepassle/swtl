import './lit-dom-shim.js';
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { getElementRenderer } from "@lit-labs/ssr/lib/element-renderer.js";
import { render as swtlRender } from '../render.js';

async function* render({ tag, children, attributes }) {
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
      renderer.attributeChangedCallback(name, null, value);
    }
  });
  renderer.connectedCallback();

  yield `<${tag}>`;
  yield `<template shadowroot="open" shadowrootmode="open">`;
  yield* renderer.renderShadow(renderInfo);
  yield `</template>`;
  yield* swtlRender(children);
  yield `</${tag}>`;
}

export const litRenderer = {
  name: 'lit',
  match({tag}) {
    const ctor = customElements.get(tag);
    if (!ctor) return false;
    return LitElementRenderer.matchesClass(ctor);
  },
  render
}