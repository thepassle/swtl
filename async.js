import { ASYNC_SYMBOL } from './symbol.js';

function Async({task, children}) {
  return { 
    task, 
    template: children.find(c => typeof c === 'function')
  };
}

Async.kind = ASYNC_SYMBOL;

const when = (condition, template) => condition ? template() : '';

export { Async, when };