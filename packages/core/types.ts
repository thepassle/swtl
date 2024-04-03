import { COMPONENT_SYMBOL, CUSTOM_ELEMENT_SYMBOL } from './symbol.js';

export interface Attribute {
  name: string;
  value: unknown;
}
export interface Property extends Attribute {}

export type HtmlValue = unknown | string | Component | CustomElement | HtmlResult;
export type Children = Array<HtmlValue>;
export type HtmlResult = Generator<HtmlValue>;

export interface Component {
  kind: typeof COMPONENT_SYMBOL;
  slots: Record<string, string>;
  properties: Array<Property>;
  children: Children;
  fn?: (props: Record<string, unknown>, children: Children) => Generator;
}

export interface CustomElement {
  tag: string;
  kind: typeof CUSTOM_ELEMENT_SYMBOL;
  attributes: Array<Attribute>;
  children: Children;
}

export interface CustomElementRenderer {
  name: string | symbol;
  match: (customElement: CustomElement) => boolean;
  render: (params: { 
    tag: CustomElement["tag"], 
    children: Children, 
    attributes: Attribute[], 
    renderers: CustomElementRenderer[] 
  }) => AsyncGenerator<string>;
}

export type RouteResult = void | Promise<void> | Response | Promise<Response> | HtmlResult | Promise<HtmlResult>;

export interface RouteArgs {
  url: URL;
  params: Record<string, string>;
  query: Record<string, string>;
  request: Request;
}

export interface Plugin {
  name: string;
  beforeResponse?: (params: RouteArgs) => RouteResult;
}

export interface Route {
  path: string,
  render: (params: RouteArgs) => RouteResult,
  plugins?: Plugin[],
  options?: RequestInit
}

export interface MatchedRoute {
  params: Record<string, string>;
  render: (params: RouteArgs) => RouteResult;
  plugins?: Plugin[];
  options?: RequestInit;
}