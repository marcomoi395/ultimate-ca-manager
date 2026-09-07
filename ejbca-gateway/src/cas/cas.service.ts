export class CasService {
  async list(): Promise<{ data: readonly unknown[] }> {
    return { data: [] };
  }
}
