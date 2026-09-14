import { describe, expect, it } from 'bun:test';
import { TemplatesController } from '../src/templates/templates.controller';

describe('template routes', () => {
  it('does not expose direct EJBCA-backed template routes', () => {
    const routeMethods = Object.getOwnPropertyNames(TemplatesController.prototype).filter((name) => name !== 'constructor');
    expect(routeMethods).toEqual([]);
  });
});
