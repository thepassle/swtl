import { Router } from '../router.js';
import { html } from '../html.js';
import assert from 'node:assert';
import { describe, it } from 'node:test';

globalThis.URLPattern = class URLPattern {
  exec() {
    return true;
  }
}

describe('Router', () => {
  it('creates a default response', async () => {
    const router = new Router({
      routes: [
      {
        path: '/foo',
        response: () => html`foo`
      }
    ]});

    const response = await router.handleRequest({url: 'https://example.com/foo'});
    const result = await response.text();
    assert.equal(result, 'foo');
    
    assert.equal(response.headers.get('Content-Type'), 'text/html');
    assert.equal(response.headers.get('Transfer-Encoding'), 'chunked');
  });

  it('can override defaults via `options`', async () => {
    const router = new Router({
      routes: [
      {
        path: '/foo',
        response: () => html`foo`,
        options: {
          status: 300,
          headers: {
            'Content-Type': 'foo'
          }
        }
      }
    ]});

    const response = await router.handleRequest({url: 'https://example.com/foo'});
    
    assert.equal(response.status, 300);
    assert.equal(response.headers.get('Content-Type'), 'foo');
  });
});