export interface GatewayConfig {
  adminToken: string;
  ejbcaApiUrl: string;
  ejbcaUsername?: string;
  ejbcaPassword?: string;
  timeoutMs: number;
}

export function loadGatewayConfig(env: Record<string, string | undefined>): GatewayConfig {
  const ejbcaApiUrl = env.EJBCA_API_URL;
  if (!ejbcaApiUrl) throw new Error('EJBCA_API_URL is required');
  const adminToken = env.GATEWAY_ADMIN_TOKEN;
  if (!adminToken) throw new Error('GATEWAY_ADMIN_TOKEN is required');
  const timeoutMs = Number(env.EJBCA_TIMEOUT_MS ?? '10000');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('EJBCA_TIMEOUT_MS is invalid');
  return { adminToken, ejbcaApiUrl, ejbcaUsername: env.EJBCA_API_USERNAME, ejbcaPassword: env.EJBCA_API_PASSWORD, timeoutMs };
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, key.toLowerCase() === 'authorization' ? '[REDACTED]' : value]));
}
