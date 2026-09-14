export interface GatewayConfig {
  authBaseUrl: string;
  internalAuthSecret: string;
  ejbcaApiUrl: string;
  ejbcaCaCertFile: string;
  ejbcaClientCertFile: string;
  ejbcaClientKeyFile: string;
  timeoutMs: number;
}

export function loadGatewayConfig(env: Record<string, string | undefined>): GatewayConfig {
  const authBaseUrl = env.UCM_AUTH_BASE_URL;
  if (!authBaseUrl) throw new Error('UCM_AUTH_BASE_URL is required');
  const internalAuthSecret = env.UCM_INTERNAL_AUTH_SECRET;
  if (!internalAuthSecret) throw new Error('UCM_INTERNAL_AUTH_SECRET is required');
  const ejbcaApiUrl = env.EJBCA_API_URL;
  if (!ejbcaApiUrl) throw new Error('EJBCA_API_URL is required');
  const caCertFile = env.EJBCA_CA_CERT_FILE;
  if (!caCertFile) throw new Error('EJBCA_CA_CERT_FILE is required');
  const clientCertFile = env.EJBCA_CLIENT_CERT_FILE;
  if (!clientCertFile) throw new Error('EJBCA_CLIENT_CERT_FILE is required');
  const clientKeyFile = env.EJBCA_CLIENT_KEY_FILE;
  if (!clientKeyFile) throw new Error('EJBCA_CLIENT_KEY_FILE is required');
  const timeoutMs = Number(env.EJBCA_TIMEOUT_MS ?? '10000');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('EJBCA_TIMEOUT_MS is invalid');
  return { authBaseUrl, internalAuthSecret, ejbcaApiUrl, ejbcaCaCertFile: caCertFile, ejbcaClientCertFile: clientCertFile, ejbcaClientKeyFile: clientKeyFile, timeoutMs };
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, ['authorization', 'x-api-key', 'x-ucm-internal-auth'].includes(key.toLowerCase()) ? '[REDACTED]' : value]));
}
