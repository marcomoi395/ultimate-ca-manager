export type AdapterStatus = 'healthy' | 'degraded' | 'unavailable';

export interface V3Meta {
  [key: string]: unknown;
}

export interface V3SuccessEnvelope<T> {
  data: T;
  message: string;
  meta: V3Meta;
}

export interface V3Error {
  error: string;
  message: string;
  code: string;
  detail?: string;
  error_code: string;
}

export interface AuthContext {
  actorId: string;
  authenticationMethod: string;
  permissions: readonly string[];
  correlationId: string;
  sourceIp: string;
  timestamp: string;
}

export interface PermissionChecker {
  hasPermission(context: AuthContext, permission: string): boolean;
}

export interface EjbcaAdapter {
  status(): Promise<AdapterStatus>;
}
