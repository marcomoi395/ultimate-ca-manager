import { Injectable, NotFoundException } from '@nestjs/common';
import { UcmProxyClient, type UcmProxyResponse } from '../common/v2-auth.client';
import type { CsrListQuery } from './dtos/csr-list.query';

type ForwardHeaders = Record<string, string | string[] | undefined>;

export interface CsrUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class CsrsService {
  constructor(private readonly proxy: UcmProxyClient) {}

  list(query: CsrListQuery, headers: ForwardHeaders): Promise<unknown> {
    return this.forward('/api/v2/csrs', this.query(query), headers);
  }

  history(query: CsrListQuery, headers: ForwardHeaders): Promise<unknown> {
    return this.forward('/api/v2/csrs/history', this.query(query), headers);
  }

  getById(id: string, headers: ForwardHeaders): Promise<unknown> {
    return this.forward(`/api/v2/csrs/${encodeURIComponent(id)}`, undefined, headers);
  }

  create(body: unknown, headers: ForwardHeaders): Promise<unknown> {
    return this.forward('/api/v2/csrs', { method: 'POST', body }, headers);
  }

  upload(body: unknown, headers: ForwardHeaders): Promise<unknown> {
    return this.forward('/api/v2/csrs/upload', { method: 'POST', body }, headers);
  }

  importCsr(file: CsrUploadFile | undefined, body: Record<string, string>, headers: ForwardHeaders): Promise<unknown> {
    const form = new FormData();
    if (file) form.append('file', new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype }), file.originalname);
    if (body.name) form.append('name', body.name);
    if (body.pem_content) form.append('pem_content', body.pem_content);
    return this.forward('/api/v2/csrs/import', { method: 'POST', body: form, multipart: true }, headers);
  }

  sign(id: string, body: unknown, headers: ForwardHeaders): Promise<unknown> {
    return this.forward(`/api/v2/csrs/${encodeURIComponent(id)}/sign`, { method: 'POST', body }, headers);
  }

  uploadKey(id: string, body: unknown, headers: ForwardHeaders): Promise<unknown> {
    return this.forward(`/api/v2/csrs/${encodeURIComponent(id)}/key`, { method: 'POST', body }, headers);
  }

  delete(id: string, headers: ForwardHeaders): Promise<unknown> {
    return this.forward(`/api/v2/csrs/${encodeURIComponent(id)}`, { method: 'DELETE' }, headers);
  }

  bulkSign(body: unknown, headers: ForwardHeaders): Promise<unknown> {
    return this.forward('/api/v2/csrs/bulk/sign', { method: 'POST', body }, headers);
  }

  bulkDelete(body: unknown, headers: ForwardHeaders): Promise<unknown> {
    return this.forward('/api/v2/csrs/bulk/delete', { method: 'POST', body }, headers);
  }

  export(id: string, headers: ForwardHeaders): Promise<UcmProxyResponse> {
    return this.proxy.request(`/api/v2/csrs/${encodeURIComponent(id)}/export`, { responseType: 'binary', headers: this.forwardHeaders(headers) });
  }

  private query(query: CsrListQuery): URLSearchParams {
    const params = new URLSearchParams({ page: String(query.page), per_page: String(query.limit) });
    if (query.search) params.set('search', query.search);
    if (query.sortBy) params.set('sort_by', query.sortBy);
    if (query.sortOrder) params.set('sort_order', query.sortOrder);
    return params;
  }

  private async forward(path: string, options: { method?: string; body?: unknown; multipart?: boolean } | URLSearchParams | undefined, headers: ForwardHeaders): Promise<unknown> {
    const isQuery = options instanceof URLSearchParams;
    const isMultipart = !isQuery && options?.multipart === true;
    const request = isQuery
      ? { headers: this.forwardHeaders(headers) }
      : { method: options?.method, body: options?.body === undefined ? undefined : isMultipart ? options.body as FormData : JSON.stringify(options.body), headers: isMultipart ? this.forwardHeaders(headers) : { ...this.forwardHeaders(headers), 'content-type': 'application/json' } };
    const suffix = isQuery ? `?${options.toString()}` : '';
    const response = await this.proxy.request(`${path}${suffix}`, request);
    if (response.status === 404) throw new NotFoundException('CSR not found');
    if (response.status >= 400) throw Object.assign(new Error('UCM CSR request failed'), { status: response.status, response: response.body });
    return this.normalizeResponse(response.body);
  }

  private normalizeResponse(body: unknown): unknown {
    if (body && typeof body === 'object' && 'data' in body && !('meta' in body)) {
      const candidate = body as { data: unknown; message?: unknown };
      return { data: candidate.data, message: typeof candidate.message === 'string' ? candidate.message : 'ok', meta: {} };
    }
    return body;
  }

  private forwardHeaders(headers: ForwardHeaders): Record<string, string> {
    const forwarded: Record<string, string> = {};
    for (const name of ['cookie', 'x-api-key', 'x-csrf-token']) {
      const value = headers[name];
      if (typeof value === 'string') forwarded[name] = value;
    }
    return forwarded;
  }
}
