import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { V3Error } from './contracts';

interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): void;
}

@Catch()
export class EjbcaErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    if (!exception || typeof exception !== 'object') {
      response.status(500).json({ error: 'Gateway error', message: 'Unexpected gateway error', code: 'GATEWAY_ERROR', error_code: 'GATEWAY_ERROR' });
      return;
    }
    const candidate = exception as Partial<V3Error> & { message?: unknown };
    if (typeof candidate.error_code === 'string') {
      const status = typeof candidate.code === 'string' && /^EJBCA_\d+$/.test(candidate.code) ? Number(candidate.code.slice(6)) : 502;
      response.status(status).json(candidate);
      return;
    }
    response.status(500).json({ error: 'Gateway error', message: typeof candidate.message === 'string' ? candidate.message : 'Unexpected gateway error', code: 'GATEWAY_ERROR', error_code: 'GATEWAY_ERROR' });
  }
}
