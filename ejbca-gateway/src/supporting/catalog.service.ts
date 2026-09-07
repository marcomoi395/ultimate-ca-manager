export class CatalogService {
  async knownEku(): Promise<{ data: readonly unknown[] }> {
    return { data: [] };
  }

  async microsoftCas(): Promise<{ data: { enabled: boolean } }> {
    return { data: { enabled: false } };
  }
}
