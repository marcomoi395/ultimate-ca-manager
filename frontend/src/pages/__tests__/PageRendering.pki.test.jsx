/**
 * Page Rendering Tests — PKI pages
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import './pageRenderingSetup.jsx'

vi.mock('../../hooks/usePersistedState', () => ({
  usePersistedState: (key, defaultValue) => [
    key === 'ucm-filter-certs-status' ? ['orphan'] : defaultValue,
    vi.fn(),
    vi.fn(),
  ],
}))

import CertificatesPage from '../CertificatesPage'
import { certificatesService } from '../../services/certificates.service'
import CAsPage from '../CAsPage'
import CSRsPage from '../CSRsPage'
import TemplatesPage from '../TemplatesPage'
import TrustStorePage from '../TrustStorePage'

function TestWrapper({ children, route = '/' }) {
  return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
}

describe('Page Rendering — PKI pages', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('CertificatesPage renders without crashing', () => {
    const { container } = render(<TestWrapper route="/certificates"><CertificatesPage /></TestWrapper>)
    expect(container.firstChild).toBeTruthy()
  })

  it('CertificatesPage shows API results despite a stale orphan filter', async () => {
    // Simulate the stale persisted filter through the hook mock above.
    certificatesService.getAll.mockResolvedValueOnce({
      data: [{
        id: '7375CA91F939EF9919313A6BF446729A6AE9629A',
        subject: 'CN=ucm-gateway',
        issuer: 'CN=ManagementCA',
        status: 'valid',
        revoked: false,
        caref: null,
      }],
      meta: { total: 1 },
    })

    render(<TestWrapper route="/certificates"><CertificatesPage /></TestWrapper>)

    expect(await screen.findByText('ucm-gateway')).toBeTruthy()
  })

  it('CAsPage renders without crashing', () => {
    const { container } = render(<TestWrapper route="/cas"><CAsPage /></TestWrapper>)
    expect(container.firstChild).toBeTruthy()
  })

  it('CSRsPage renders without crashing', () => {
    const { container } = render(<TestWrapper route="/csrs"><CSRsPage /></TestWrapper>)
    expect(container.firstChild).toBeTruthy()
  })

  it('TemplatesPage renders without crashing', () => {
    const { container } = render(<TestWrapper route="/templates"><TemplatesPage /></TestWrapper>)
    expect(container.firstChild).toBeTruthy()
  })

  it('TrustStorePage renders without crashing', () => {
    const { container } = render(<TestWrapper route="/truststore"><TrustStorePage /></TestWrapper>)
    expect(container.firstChild).toBeTruthy()
  })
})
