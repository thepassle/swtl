import { render } from './render.js';

/**
 * @typedef {import('./types.js').CustomElementRenderer} CustomElementRenderer
 * @typedef {import('./types.js').Route} Route
 * @typedef {import('./types.js').MatchedRoute} MatchedRoute
 * @typedef {import('./types.js').RouteArgs} RouteArgs
 * @typedef {import('./types.js').RouteResult} RouteResult
 * @typedef {import('./types.js').Plugin} Plugin
 * @typedef {import('./types.js').HtmlResult} HtmlResult
 */

export class Router {
  /**
   * @param {{
   *  routes: Route[],
   *  fallback: (args: RouteArgs) => RouteResult,
   *  plugins?: Plugin[],
   *  baseHref?: string,
   *  customElementRenderers?: CustomElementRenderer[]
   * }} params
   */
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
      // @ts-expect-error
      urlPattern: new URLPattern({
        pathname: `${baseHref}${route.path}`,
        search: '*',
        hash: '*',
      })
    }));
  }

  /**
   * @param {MatchedRoute} route 
   * @returns {Plugin[]}
   */
  _getPlugins(route) {
    return [
      ...(this.plugins ?? []), 
      ...(route?.plugins ?? []),
    ]
  }

  /**
   * @param {Request} request 
   */
  async handleRequest(request) {
    const url = new URL(request.url);
    let matchedRoute;

    for (const route of this.routes) {

      const match = route.urlPattern.exec(url);
      if (match) {
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

      const plugins = this._getPlugins(/** @type {MatchedRoute} */ (matchedRoute));
      for (const {name, beforeResponse} of plugins) {
        try {
          const result = await beforeResponse?.({url, query, params, request});
          if (result) {
            return result;
          }
        } catch(e) {
          console.log(`Plugin "${name}" error on beforeResponse hook`, e);
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
  /**
   * 
   * @param {unknown} template 
   * @param {*} routeOptions 
   * @param {*} renderOptions 
   * @returns 
   */
  constructor(template, routeOptions = {}, renderOptions = {}) {
    // @ts-expect-error
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
          console.error(/** @type {Error} */ (e).stack);
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