export class ImportService {
  async analyze(input: unknown): Promise<{ data: { status: 'analyzed' } }> {
    void input;
    return { data: { status: 'analyzed' } };
  }

  async execute(input: unknown): Promise<{ data: { status: 'blocked' } }> {
    void input;
    return { data: { status: 'blocked' } };
  }
}
