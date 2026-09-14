import { describe, expect, it } from 'bun:test';
import { compareProjection } from '../src/projections/comparison';

describe('projection comparison', () => {
  it('classifies equal and drifted payloads', () => {
    expect(compareProjection({ subject: 'CN=Root' }, { subject: 'CN=Root' })).toBe('MATCHED');
    expect(compareProjection({ subject: 'CN=Root' }, { subject: 'CN=Other' })).toBe('DRIFTED');
  });
});
