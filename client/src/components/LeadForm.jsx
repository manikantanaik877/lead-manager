import { useState } from 'react'
import { api } from '../api'
import { validateLead } from '../validation'
import Field from './Field'
import Modal from './Modal'

const EMPTY = { name: '', email: '', phone: '', company: '', source: '', status: 'New' }

/** Add / edit form. Pass `lead` to edit, omit to create. */
export default function LeadForm({ lead, meta, onSaved, onClose }) {
  const isEdit = Boolean(lead)
  const [values, setValues] = useState(() => (lead ? { ...EMPTY, ...lead } : EMPTY))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    // Clear a field's error as soon as the user starts fixing it.
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validateLead(values, meta.sources)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    setSaving(true)
    try {
      const saved = isEdit ? await api.updateLead(lead.id, values) : await api.createLead(values)
      onSaved(saved, isEdit)
    } catch (err) {
      setErrors(err.details || {})
      setFormError(err.status === 422 ? 'Please fix the highlighted fields.' : err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit lead' : 'Add lead'} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        {formError && <div className="alert" role="alert">{formError}</div>}

        <div className="grid-2">
          <Field label="Name *" error={errors.name}>
            <input value={values.name} onChange={set('name')} maxLength={100} autoComplete="off" />
          </Field>
          <Field label="Company *" error={errors.company}>
            <input value={values.company} onChange={set('company')} maxLength={100} autoComplete="off" />
          </Field>
          <Field label="Email *" error={errors.email}>
            <input type="email" value={values.email} onChange={set('email')} autoComplete="off" />
          </Field>
          <Field label="Phone *" error={errors.phone}>
            <input type="tel" value={values.phone} onChange={set('phone')} autoComplete="off" placeholder="+91 98765 43210" />
          </Field>
          <Field label="Source *" error={errors.source}>
            <select value={values.source} onChange={set('source')}>
              <option value="">Select a source…</option>
              {meta.sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status" error={errors.status}>
            <select value={values.status} onChange={set('status')}>
              {meta.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add lead'}</button>
        </footer>
      </form>
    </Modal>
  )
}
