import { render } from './render.js';

export class Router {
  constructor({ 
    routes, 
    fallback, 
    plugins = [], 
    baseHref = '' 
  }) {
    this.plugins = plugins;
    this.fallback = {
      render: fallback,
      params: {}
    };
    this.routes = routes.map(route => ({
      ...route,
      urlPattern: new URLPattern({
        pathname: `${baseHref}${route.path}`,
        search: '*',
        hash: '*',
      })
    }));
  }

  _getPlugins(route) {
    return [
      ...(this.plugins ?? []), 
      ...(route?.plugins ?? []),
    ]
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
          plugins: route.plugins,
        };
        break;
      }
    }

    const route = matchedRoute?.render ?? this?.fallback?.render;
    if (route) {
      const query = Object.fromEntries(new URLSearchParams(new URL(request.url).search));
      const params = matchedRoute?.params;

      const plugins = this._getPlugins(matchedRoute);
      for (const plugin of plugins) {
        try {
          const result = await plugin?.beforeResponse({query, params, request});
          if (result) {
            return result;
          }
        } catch(e) {
          console.log(`Plugin "${plugin.name}" error on beforeResponse hook`, e);
          throw e;
        }
      }

      return new HtmlResponse(await route({query, params, request}));
    }
  }
}

export class HtmlResponse {
  constructor(template) {
    const iterator = render(template);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await iterator.next();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(encoder.encode(value));
          }
        } catch(e) {
          console.error(e.stack);
          throw e;
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