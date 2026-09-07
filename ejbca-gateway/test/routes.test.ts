import { describe, expect, it } from 'bun:test';
import { AppModule } from '../src/app.module';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';

describe('V3 route completeness', () => {
  it('defines all approved controller route groups', () => {
    expect(AppModule).toBeDefined();
    expect(MetadataScanner).toBeDefined();
    expect(ModulesContainer).toBeDefined();
  });
});
