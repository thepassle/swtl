import assert from "node:assert";
import { describe, it } from "node:test";
import { LitElement, css, html as litHtml } from "lit";
import { html } from "swtl/html.js";
import { renderToString } from "swtl/render.js";
import { litRenderer } from "../index.js";
import { defaultRenderer } from 'swtl/ssr/default.js';

describe("ssr", () => {
  describe("lit", () => {
    class FooEl extends LitElement {
      static styles = css`h1 { color: red; }`;
      static properties = {
        disabled: { type: Boolean },
        foo: { type: String },
      };
      render() {
        return litHtml`<h1>foo: ${this.foo} ${this.disabled ? "yyy" : "zzz"}</h1>`;
      }
    }

    customElements.define("foo-el", FooEl);

    it("basic", async () => {
      const result = await renderToString(
        html`<foo-el foo="bar" disabled>children</foo-el>`,
        [litRenderer]
      );

      assert(result.includes("<foo-el>"));
      assert(result.includes('<template shadowroot="open" shadowrootmode="open">'));
      assert(result.includes("<style>h1 { color: red; }</style>"));
      assert(result.includes("yyy"));
      assert(result.includes("bar"));
      assert(result.includes("children"));
      assert(result.includes("</template>"));
      assert(result.includes("</foo-el>"));
    });

    it("nested swtl component", async () => {
      function Foo() {
        return html`<h2>Foo</h2>`;
      }
      const result = await renderToString(
        html`<foo-el foo="bar" disabled><${Foo} /></foo-el>`,
        [litRenderer]
      );
      assert(result.includes("<foo-el>"));
      assert(result.includes('<template shadowroot="open" shadowrootmode="open">'));
      assert(result.includes("<style>h1 { color: red; }</style>"));
      assert(result.includes("yyy"));
      assert(result.includes("bar"));

      assert(result.includes("<h2>Foo</h2>"));
      assert(result.includes("</template>"));
      assert(result.includes("</foo-el>"));
    });

    it("property", async () => {
      class PropertyEl extends LitElement {
        static properties = { foo: { type: Object } };
        render() {
          return litHtml`<h1>${this.foo.a}</h1>`;
        }
      }
      customElements.define("property-el", PropertyEl);
      const result = await renderToString(
        html`<property-el .foo=${{ a: "zzz" }}></property-el>`,
        [litRenderer]
      );
      assert(result.includes("zzz"));
    });
  });

  it("supports multiple renderers", async () => {
    class A extends LitElement {
      render() {
        return litHtml`<h1>lit</h1>`;
      }
    }
    customElements.define("lit-el", A);

    const result = await renderToString(
      html`<lit-el></lit-el><html-el></html-el>`,
      [litRenderer, defaultRenderer]
    );
    assert(result.includes("<lit-el><template shadowroot"));
    assert(result.includes("<html-el></html-el>"));
  });
});
