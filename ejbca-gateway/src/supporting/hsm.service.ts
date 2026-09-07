export class HsmService {
  async providers(): Promise<{ data: readonly unknown[] }> {
    return { data: [] };
  }

  async keys(): Promise<{ data: readonly unknown[] }> {
    return { data: [] };
  }

  async status(): Promise<{ data: { status: 'unavailable' } }> {
    return { data: { status: 'unavailable' } };
  }
}
