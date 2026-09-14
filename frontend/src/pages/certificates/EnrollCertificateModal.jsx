import { useState } from 'react'
import { Certificate, UploadSimple } from '@phosphor-icons/react'
import { Button, Input, Modal, Select, Textarea } from '../../components'

const emptyForm = {
  certificate_request: '',
  certificate_profile_name: '',
  end_entity_profile_name: '',
  certificate_authority_name: '',
  username: '',
  password: '',
}

export function EnrollCertificateModal({ open, onOpenChange, cas, onSubmit, t }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const close = (force = false) => {
    if (submitting && !force) return
    setForm(emptyForm)
    setError('')
    onOpenChange(false)
  }

  const update = (field, value) => {
    setError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        certificate_request: form.certificate_request.trim(),
      })
      close(true)
    } catch (submissionError) {
      setError(submissionError.message || t('common.operationFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const caOptions = cas
    .map((ca) => ca.name || ca.common_name)
    .filter(Boolean)
    .map((name) => ({ value: name, label: name }))

  return (
    <Modal open={open} onOpenChange={(isOpen) => { if (!isOpen) close() }} title={t('certificates.issueCertificate')}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <p className="text-sm text-text-secondary">
          {t('csrs.pasteCSRDescription')}
        </p>

        <Textarea
          label={t('csrs.pasteCSR')}
          value={form.certificate_request}
          onChange={(event) => update('certificate_request', event.target.value)}
          placeholder={'-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----'}
          helperText="PEM CSR or DER Base64. Your private key remains outside UCM."
          rows={9}
          className="font-mono text-xs"
          required
        />

        <Select
          label={t('common.certificateAuthority')}
          options={caOptions}
          value={form.certificate_authority_name}
          onChange={(value) => update('certificate_authority_name', value)}
          placeholder={t('csrs.selectCA')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="EJBCA Certificate Profile"
            value={form.certificate_profile_name}
            onChange={(event) => update('certificate_profile_name', event.target.value)}
            required
            helperText="The exact profile name configured in EJBCA, for example UCMGATEWAY."
          />
          <Input
            label="EJBCA End Entity Profile"
            value={form.end_entity_profile_name}
            onChange={(event) => update('end_entity_profile_name', event.target.value)}
            required
            helperText="The exact end entity profile name configured in EJBCA, for example UCM-Gateway-Client-Entity."
          />
          <Input
            label={t('common.username')}
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            required
          />
          <Input
            label={t('common.password')}
            type="password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            noAutofill
            required
          />
        </div>

        {error && <p role="alert" className="text-sm status-danger-text">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !form.certificate_authority_name}>
            {submitting ? <Certificate size={16} className="animate-pulse" /> : <UploadSimple size={16} />}
            {t('certificates.issueCertificate')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
