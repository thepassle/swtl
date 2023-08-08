export function* render(template) {
  for (const chunk of template) {
    if (typeof chunk === 'string') {
      yield chunk;
    } else {
      yield* render(chunk.fn({
        ...chunk.properties,
        children: chunk.children,
      }));
    }
  } 
}

export function renderToString(renderResult) {
  let result = '';

  for(const chunk of render(renderResult)) {
    result += chunk;
  }
  return result;
}