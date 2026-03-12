// strategies/index.ts
import { BlockStrategy } from './blockStrategy';
import { PortStrategy } from './portStrategy';

const registry = {
  Block: new BlockStrategy(),
  Port: new PortStrategy(),
};

export const getStrategy = (type) => registry[type];
