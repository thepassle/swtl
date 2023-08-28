import { AWAIT_SYMBOL } from './symbol.js';

function Await({promise, children}) {
  return { 
    promise, 
    template: children.find(c => typeof c === 'function')
  };
}

Await.kind = AWAIT_SYMBOL;

const when = (condition, template) => condition ? template() : '';

export { Await, when };