import { Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { V3Meta, V3SuccessEnvelope } from './contracts';

interface PagedBody {
  data: unknown;
  meta?: V3Meta;
}

function isEnvelope(body: unknown): body is V3SuccessEnvelope<unknown> {
  if (body === null || typeof body !== 'object') return false;
  return 'data' in body && 'message' in body && 'meta' in body;
}

function isPagedBody(body: unknown): body is PagedBody {
  if (body === null || typeof body !== 'object' || isEnvelope(body)) return false;
  if (!('data' in body)) return false;
  return 'meta' in body || Array.isArray((body as PagedBody).data);
}

/**
 * Wraps every handler result into the V3 success envelope { data, message, meta }.
 *
 * - Raw values (objects, arrays, scalars) become `data`.
 * - Service-level `{ data, meta }` pagination payloads are hoisted: `data` stays,
 *   `meta` moves to the envelope level (no nested `data.data`).
 * - Already-enveloped responses (health/contract helpers) pass through untouched.
 * - Binary streams (Blob/Buffer/StreamableFile) pass through without wrapping.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const statusCode: number = context.switchToHttp().getResponse()?.statusCode ?? 200;
    const extraMeta: V3Meta = statusCode === 200 ? {} : { http_status: statusCode };
    return next.handle().pipe(
      map((body: unknown) => {
        if (body === undefined || body === null) {
          return { data: body, message: 'ok', meta: { ...extraMeta } };
        }
        if (body instanceof Blob || body instanceof Buffer || body instanceof StreamableFile) {
          return body;
        }
        if (isEnvelope(body)) {
          return extraMeta.http_status === undefined ? body : { ...body, meta: { ...body.meta, ...extraMeta } };
        }
        if (isPagedBody(body)) {
          return { data: body.data, message: 'ok', meta: { ...body.meta, ...extraMeta } };
        }
        return { data: body, message: 'ok', meta: { ...extraMeta } };
      }),
    );
  }
}
