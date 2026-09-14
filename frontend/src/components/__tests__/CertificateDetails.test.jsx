import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('../deploy/CertDeploySection', () => ({
  CertDeploySection: () => null,
}))

vi.mock('../ExportModal', () => ({
  ExportModal: () => null,
}))

vi.mock('../CertificateLintModal', () => ({
  CertificateLintModal: () => null,
}))

import { CertificateDetails } from '../CertificateDetails'

describe('CertificateDetails', () => {
  it('shows a v3 Subject DN and derives its common name when embedded', () => {
    render(
      <CertificateDetails
        certificate={{
          id: '7500EBD46CB36F1A69B98292486FA7A73F710A1B',
          serial_number: '7500EBD46CB36F1A69B98292486FA7A73F710A1B',
          subject: 'CN=demo-test-2026',
          ski: 'f57e37533792e124ae96ad3227e2dbe1fc8300aa',
          revoked: true,
        }}
        embedded
        showPem={false}
      />,
    )

    expect(screen.getByText('demo-test-2026')).toBeInTheDocument()
    expect(screen.getByText('CN=demo-test-2026')).toBeInTheDocument()
    expect(screen.getByText('f57e37533792e124ae96ad3227e2dbe1fc8300aa')).toBeInTheDocument()
  })

  it('renders EJBCA’s -1 revocation reason as unspecified', () => {
    render(
      <CertificateDetails
        certificate={{
          id: '7500EBD46CB36F1A69B98292486FA7A73F710A1B',
          serial_number: '7500EBD46CB36F1A69B98292486FA7A73F710A1B',
          subject: 'CN=demo-test-2026',
          status: 'revoked',
          revoked: true,
          revoke_reason: -1,
        }}
        embedded
        showPem={false}
      />,
    )

    expect(screen.getByText('details.unspecified')).toBeInTheDocument()
    expect(screen.queryByText('-1')).not.toBeInTheDocument()
  })
})
