import { COMPONENT_SYMBOL } from './symbol.js';

export function* render(template) {
  for (const chunk of template) {
    if (typeof chunk === 'string') {
      yield chunk;
    } else if (chunk.kind === COMPONENT_SYMBOL) {
      yield* render(chunk.fn({
        ...chunk.properties,
        children: chunk.children,
      }));
    } else if (Array.isArray(chunk)) {
      yield* render(chunk);
    } else {
      yield chunk.toString();
    }
  } 
}

export function renderToString(renderResult) {
  let result = '';

  for(const chunk of render(renderResult)) {
    result += chunk;
  }
  
  return result.replaceAll(' ', '');
}