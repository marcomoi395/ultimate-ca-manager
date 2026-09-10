import { describe, expect, it, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnrollCertificateModal } from './EnrollCertificateModal'

beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false)
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {})
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {})
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})
})

describe('EnrollCertificateModal', () => {
  it('submits the direct CSR enrollment payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EnrollCertificateModal
        open
        onOpenChange={vi.fn()}
        cas={[{ name: 'ManagementCA' }]}
        onSubmit={onSubmit}
        t={(key) => key}
      />,
    )

    await user.type(document.querySelector('textarea'), '-----BEGIN CERTIFICATE REQUEST-----\n...')
    const inputs = document.querySelectorAll('input')
    await user.type(inputs[0], 'TLS')
    await user.type(inputs[1], 'Default')
    await user.type(inputs[2], 'enrollment-user')
    await user.type(inputs[3], 'enrollment-password')
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'ManagementCA' }))
    await user.click(screen.getByRole('button', { name: 'certificates.issueCertificate' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      certificate_request: '-----BEGIN CERTIFICATE REQUEST-----\n...',
      certificate_profile_name: 'TLS',
      end_entity_profile_name: 'Default',
      certificate_authority_name: 'ManagementCA',
      username: 'enrollment-user',
      password: 'enrollment-password',
    }))
  })
})
