import './lit-dom-shim.js';
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { getElementRenderer } from "@lit-labs/ssr/lib/element-renderer.js";
import { render } from '../render.js';

export async function* litRenderer({ tag, children, attributes }) {
  const renderInfo = {
    elementRenderers: [LitElementRenderer],
    customElementInstanceStack: [],
    customElementHostStack: [],
    deferHydration: false,
  };
  const renderer = getElementRenderer(renderInfo, tag);
  attributes.forEach(({ name, value }) => {
    renderer.attributeChangedCallback(name, null, value);
  });
  renderer.connectedCallback();

  yield `<${tag}>`;
  yield `<template shadowroot="open" shadowrootmode="open">`;
  yield* renderer.renderShadow(renderInfo);
  yield `</template>`;
  yield* render(children);
  yield `</${tag}>`;
}