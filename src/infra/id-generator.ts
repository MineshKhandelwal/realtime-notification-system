import { randomUUID } from 'crypto';

export interface IdGenerator {
  next(): string;
}

export const uuidGenerator: IdGenerator = { next: () => randomUUID() };

/** Readable, deterministic IDs (`evt-1`, `evt-2`, …) for the demo and tests. */
export function createSequentialIdGenerator(prefix: string): IdGenerator {
  let counter = 0;
  return { next: () => `${prefix}-${++counter}` };
}
