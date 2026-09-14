import { describe, expect, it } from 'bun:test';
import { MscaController } from '../src/supporting/msca.controller';
import { HsmController } from '../src/supporting/hsm.controller';
import { CatalogService } from '../src/supporting/catalog.service';
import { HsmService } from '../src/supporting/hsm.service';

function recordingAdapter() {
  const paths: string[] = [];
  return {
    paths,
    request: async (path: string) => {
      paths.push(path);
      return { ok: true };
    },
  } as never;
}

describe('supporting route wiring', () => {
  it('msca reads resolve through the adapter with preserved ids', async () => {
    const adapter = recordingAdapter();
    const controller = new MscaController(new CatalogService(adapter));
    expect(await controller.enabled()).toEqual({ enabled: true });
    expect(await controller.pending()).toEqual({ ok: true });
    expect(await controller.templates('ca 1')).toEqual({ ok: true });
    expect(await controller.request('req-7')).toEqual({ ok: true });
    expect(adapter.paths).toEqual([
      '/v1/ca/status',
      '/v1/approval',
      '/v1/ca/ca%201/certificateprofile',
      '/v1/approval/req-7',
    ]);
  });

  it('hsm reads resolve through the adapter', async () => {
    const adapter = recordingAdapter();
    const controller = new HsmController(new HsmService(adapter));
    expect(await controller.providers()).toEqual({ ok: true });
    expect(await controller.keys()).toEqual({ ok: true });
    expect(adapter.paths).toEqual(['/v1/cryptotoken', '/v1/cryptotoken/keypair']);
  });
});
