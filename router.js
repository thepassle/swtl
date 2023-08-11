import { render } from './render.js';

export class Router {
  constructor({ routes }) {
    this.routes = routes.map(route => ({
      ...route,
      urlPattern: new URLPattern({
        pathname: route.path,
        baseURL: self.location.origin,
        search: '*',
        hash: '*',
      })
    }));
  }

  async handleRequest(request) {
    const url = new URL(request.url);

    for (const route of this.routes) {
      const match = route.urlPattern.exec(url);
      if(match) {
        const query = Object.fromEntries(new URLSearchParams(request.url.search));
        const params = match?.pathname?.groups ?? {};

        const iterator = render(route.render({query, params, request}));
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async pull(controller) {
            const { value, done } = await iterator.next();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(encoder.encode(value));
            }
          }
        });


        return new Response(stream, { 
          status: 200,
          headers: { 
            'Content-Type': 'text/html', 
            'Transfer-Encoding': 'chunked', 
          } 
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}