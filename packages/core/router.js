import { render } from './render.js';

export class Router {
  constructor({ 
    routes, 
    fallback, 
    plugins = [], 
    baseHref = '',
    customElementRenderers = []
  }) {
    this.plugins = plugins;
    this.customElementRenderers = customElementRenderers;
    
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
          options: route.options,
          render: route.render,
          params: match?.pathname?.groups ?? {},
          plugins: route.plugins,
        };
        break;
      }
    }

    const route = matchedRoute?.render ?? this?.fallback?.render;
    if (route) {
      const url = new URL(request.url);
      const query = Object.fromEntries(new URLSearchParams(url.search));
      const params = matchedRoute?.params;

      const plugins = this._getPlugins(matchedRoute);
      for (const plugin of plugins) {
        try {
          const result = await plugin?.beforeResponse({url, query, params, request});
          if (result) {
            return result;
          }
        } catch(e) {
          console.log(`Plugin "${plugin.name}" error on beforeResponse hook`, e);
          throw e;
        }
      }

      return new HtmlResponse(
        await route({url, query, params, request}), 
        matchedRoute?.options ?? {},
        {
          renderers: this.customElementRenderers
        }
      );
    }
  }
}

export class HtmlResponse {
  constructor(template, routeOptions = {}, renderOptions = {}) {
    const iterator = render(template, renderOptions.renderers);
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
        ...(routeOptions?.headers ?? {})
      },
      ...routeOptions
    });
  }
}