import { useState } from 'react'
import { api } from '../api'
import Modal from './Modal'

export default function ConfirmDelete({ lead, onDeleted, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await api.deleteLead(lead.id)
      onDeleted(lead)
    } catch (err) {
      // A 404 means it's already gone (e.g. deleted in another tab); treat as success.
      if (err.status === 404) return onDeleted(lead)
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Delete lead?" onClose={onClose} size="sm">
      {error && <div className="alert" role="alert">{error}</div>}
      <p>
        This will permanently delete <strong>{lead.name}</strong> ({lead.company}). This can't be undone.
      </p>
      <footer className="modal-footer">
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn danger" onClick={confirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
      </footer>
    </Modal>
  )
}
