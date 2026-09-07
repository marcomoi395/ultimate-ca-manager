export interface CertificateSummary {
  id: string;
  status: string;
}

export interface CertificateListQuery {
  page: number;
  limit: number;
}

export class CertificatesService {
  constructor(
    private readonly reader: (
      query: CertificateListQuery,
    ) => Promise<CertificateSummary[]> = async () => [],
  ) {}
  async list(
    query: CertificateListQuery,
  ): Promise<{
    data: CertificateSummary[];
    meta: { page: number; limit: number };
  }> {
    const data = await this.reader(query);
    return { data, meta: { page: query.page, limit: query.limit } };
  }

  async getById(id: string): Promise<CertificateSummary | { status: 'MISSING' }> {
    const data = await this.reader({ page: 1, limit: 100 });
    return data.find((certificate) => certificate.id === id) ?? { status: 'MISSING' };
  }
}
