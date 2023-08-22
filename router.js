import { render } from './render.js';

export class Router {
  constructor({ routes, fallback, baseHref = '' }) {
    this.fallback = {
      render: fallback,
      params: {}
    };
    this.routes = routes.map(route => ({
      ...route,
      urlPattern: new URLPattern({
        pathname: route.path,
        baseURL: `${self.location.origin}${baseHref}`,
        search: '*',
        hash: '*',
      })
    }));
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    let matchedRoute;

    for (const route of this.routes) {

      const match = route.urlPattern.exec(url);
      if(match) {
        matchedRoute = {
          render: route.render,
          params: match?.pathname?.groups ?? {},
        };
        break;
      }
    }

    const route = matchedRoute?.render ?? this?.fallback?.render;
    if(route) {
      const query = Object.fromEntries(new URLSearchParams(request.url.search));

      const iterator = render(route({query, params: matchedRoute?.params, request}));
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
}