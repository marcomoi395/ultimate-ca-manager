export class TemplatesService {
  async list(): Promise<{ data: readonly unknown[] }> {
    return { data: [] };
  }

  async getById(id: string): Promise<{ status: 'MISSING' }> {
    void id;
    return { status: 'MISSING' };
  }
}
