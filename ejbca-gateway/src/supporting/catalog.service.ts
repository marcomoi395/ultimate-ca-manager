import { Inject, Injectable, Optional } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

export interface EkuCatalogEntry {
  oid: string;
  name: string;
}

// RFC 5280 §4.2.1.12 well-known Extended Key Usage OIDs plus the Microsoft /
// vendor key purposes the UCM catalog (backend/utils/cert_extensions.py
// EKU_NAMES) exposes to the UI. EJBCA REST has no EKU catalog resource, so the
// gateway serves the same static catalog until an upstream source exists.
const EKU_CATALOG: readonly EkuCatalogEntry[] = [
  { oid: '1.3.6.1.5.5.7.3.1', name: 'serverAuth' },
  { oid: '1.3.6.1.5.5.7.3.2', name: 'clientAuth' },
  { oid: '1.3.6.1.5.5.7.3.3', name: 'codeSigning' },
  { oid: '1.3.6.1.5.5.7.3.4', name: 'emailProtection' },
  { oid: '1.3.6.1.5.5.7.3.5', name: 'ipsecEndSystem' },
  { oid: '1.3.6.1.5.5.7.3.6', name: 'ipsecTunnel' },
  { oid: '1.3.6.1.5.5.7.3.7', name: 'ipsecUser' },
  { oid: '1.3.6.1.5.5.7.3.8', name: 'timeStamping' },
  { oid: '1.3.6.1.5.5.7.3.9', name: 'OCSPSigning' },
  { oid: '1.3.6.1.5.5.8.2.2', name: 'iKEIntermediate' },
  { oid: '1.3.6.1.5.2.3.4', name: 'id-pkinit-KPClientAuth' },
  { oid: '1.3.6.1.5.2.3.5', name: 'id-pkinit-KPkdc' },
  { oid: '1.3.6.1.4.1.311.10.3.1', name: 'msCTLSign' },
  { oid: '1.3.6.1.4.1.311.10.3.3', name: 'msCodeSGC' },
  { oid: '1.3.6.1.4.1.311.10.3.4', name: 'msEFS' },
  { oid: '1.3.6.1.4.1.311.10.3.12', name: 'msDocumentSigning' },
  { oid: '1.3.6.1.4.1.311.20.2.2', name: 'msSmartcardLogin' },
  { oid: '2.16.840.1.113730.4.1', name: 'nsSGC' },
  { oid: '1.3.6.1.4.1.311.54.1.2', name: 'msRemoteDesktop' },
  { oid: '2.23.140.1.31', name: 'evSSLServer' },
  { oid: '1.3.6.1.4.1.311.2.1.21', name: 'msIndividualCodeSigning' },
  { oid: '1.3.6.1.4.1.311.2.1.22', name: 'msCommercialCodeSigning' },
  { oid: '1.3.6.1.4.1.311.10.3.13', name: 'msLifetimeSigning' },
  { oid: '1.3.6.1.4.1.311.61.1.1', name: 'msKernelModeCodeSigning' },
  { oid: '1.2.840.113635.100.4.1', name: 'appleCodeSigning' },
  { oid: '1.2.840.113635.100.4.13', name: 'appleDeveloperIDApplication' },
];

@Injectable()
export class CatalogService {
  constructor(@Inject(EjbcaResourceAdapter) @Optional() private readonly adapter?: EjbcaResourceAdapter) {}

  knownEku(): { ekus: readonly EkuCatalogEntry[] } {
    return { ekus: EKU_CATALOG };
  }

  async microsoftCas(): Promise<{ enabled: boolean }> {
    if (!this.adapter) return { enabled: false };
    const status = await this.adapter.request('/v1/ca/status');
    return { enabled: Array.isArray(status) ? status.length > 0 : Boolean(status) };
  }

  async mscaPendingRequests(): Promise<unknown> {
    if (!this.adapter) return [];
    return this.adapter.request('/v1/approval');
  }

  async mscaTemplates(id: string): Promise<unknown> {
    if (!this.adapter) return [];
    return this.adapter.request(`/v1/ca/${encodeURIComponent(id)}/certificateprofile`);
  }

  async mscaRequestStatus(requestId: string): Promise<unknown> {
    if (!this.adapter) return null;
    return this.adapter.request(`/v1/approval/${encodeURIComponent(requestId)}`);
  }
}
