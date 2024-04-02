# SWTL

A Service Worker Templating Language (`swtl`) for component-like templating in service workers. Streams templates to the browser as they're being parsed, and handles rendering iterables/Responses in templates by default. Also supports SSR/SWSRing custom elements, with a pluggable custom element renderer system.

Runs in Service Workers, but can also be used in Node, or other server-side JS environments.


## Packages

- [`swtl`](./packages/core) - Service Worker Templating Language
- [`@swtl/lit`](./packages/lit) - Custom Element Renderer to SSR/SWSR LitElements