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
   *  fallback?: (args: RouteArgs) => RouteResult,
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
      response: fallback,
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
          response: route.response,
          params: match?.pathname?.groups ?? {},
          plugins: route.plugins,
        };
        break;
      }
    }

    const route = matchedRoute?.response ?? this?.fallback?.response;
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

      const response = await route({url, query, params, request});
      if (response instanceof Response) {
        return response;
      }

      return new HtmlResponse(
        /** @type {HtmlResult} */ (response), 
        matchedRoute?.options ?? {},
        {
          renderers: this.customElementRenderers
        }
      );
    }
  }
}

/**
 * @param {HtmlResult} template 
 * @param {{renderers?: CustomElementRenderer[]}} renderOptions 
 * @returns {ReadableStream}
 */
function createStream(template, renderOptions) {
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

  return stream;
}

export class HtmlResponse extends Response {
  /**
   * @param {HtmlResult} template 
   * @param {Partial<RequestInit>} routeOptions 
   * @param {{renderers?: CustomElementRenderer[]}} renderOptions 
   */
  constructor(template, routeOptions = {}, renderOptions = {}) {
    super(
      createStream(template, renderOptions),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'text/html', 
          'Transfer-Encoding': 'chunked', 
          ...(routeOptions?.headers ?? {})
        },
        ...routeOptions
      }
    );
  }
}