async function Bar() {
  return html`<h2>bar</h2>`;
}

const stream = new ReadableStream({
  start(controller) {
    ['a', 'b', 'c'].forEach(s => controller.enqueue(s));
    controller.close();
  }
});

function* gen() {
  yield 1;
  yield 2;
  yield 3;
}

console.log(await renderToString(html`
  <main> 
    ${stream}
    <${Bar}/>
    ${gen()}
  </main>
`));