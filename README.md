# swsr-dsl-thing

## Example

```js
import { html } from 'todo';

function Header() {
  return html`<h1>Hello world!</h1>`;
}

function BreadCrumbs({path}) {
  const crumbs = path.split('/').filter(Boolean);
  let currentPath = '';

  return html`<ul>
    ${crumbs.map(crumb => {
      currentPath += `/${crumb}`
      return html`<li><a href="${currentPath}">${crumb}</a></li>`
    })}
  </ul>`
}

const page = html`
  <html>
    <head></head>
    <body>
      <${Header}/>
      <nav>
        <${BreadCrumbs} path=${event.request.url.pathname}/>
      </nav>
      <ul>
        ${[1, 2, 3].map(i => html`<li>${i}</li>`)}
      </ul>
    </body>
  </html>
`
```

## [html] Usage

### Basic

```js
import { html } from 'todo';

const template = html`<h1>hello world</h1>`;
```

### Children

```js
import { html } from 'todo';

function Foo({children}) {
  return html`<main>${children}</main>`;
}

const template = html`<${Foo}>hello world<//>`;
```

### Self-closing

```js
import { html } from 'todo';

function Foo() {
  return html`<h1>hello</h1>`;
}

const template = html`
  <${Foo}/>
  <h2>world</h2>
`;
```

### Lists

```js
import { html } from 'todo';

const template = html`
  <ul>
    ${[1, 2, 3].map(i => html`<li>${i}</li>`)}
  </ul>
`;
```

### Properties - strings

```js
import { html } from 'todo';

function Foo({bar}) {
  return html`<h1>${bar}</h1>`;
}

const template = html`<${Foo} bar="baz"/>`;
```

### Properties - expressions

```js
import { html } from 'todo';

function Foo({bar}) {
  return html`<ul>${bar.map(i => html`<li>${i}</li>`)}</ul>`;
}

const arr = [1,2,3];
const template = html`<${Foo} bar=${arr}/>`;
```

### Properties - spread

```js
import { html } from 'todo';

function Foo({a,b,c}) {
  return html`
    <h1>${a}</h1>
    <h2>${b}</h2>
    <h3>${c}</h3>
  `;
}

const obj = {
  a: 1,
  b: 2,
  c: 3
};
const template = html`<${Foo} ...${obj}/>`;
```