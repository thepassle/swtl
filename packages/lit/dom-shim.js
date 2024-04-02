import {
  HTMLElement,
  Element,
  CustomElementRegistry,
} from "@lit-labs/ssr-dom-shim";

export const getWindow = () => {
  class ShadowRoot {}
  class Document {
    get adoptedStyleSheets() {
      return [];
    }
    createTreeWalker() {
      return {};
    }
    createTextNode() {
      return {};
    }
    createElement() {
      return {};
    }
  }
  class CSSStyleSheet {
    replace() {}
  }
  const window = {
    Element,
    HTMLElement,
    Document,
    document: new Document(),
    CSSStyleSheet,
    ShadowRoot,
    CustomElementRegistry,
    customElements: new CustomElementRegistry(),
    MutationObserver: class {
      observe() {}
    },
    requestAnimationFrame() {},
    window: undefined,
  };
  return window;
};
export const installWindowOnGlobal = () => {
  if (globalThis.window === undefined) {
    const window = getWindow();
    Object.assign(globalThis, window);
  }
};

installWindowOnGlobal();
