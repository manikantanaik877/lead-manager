import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useDebounce } from '../hooks'
import ConfirmDelete from './ConfirmDelete'
import LeadForm from './LeadForm'
import LeadsTable from './LeadsTable'
import Pagination from './Pagination'
import StatsBar from './StatsBar'

const PAGE_SIZE = 10

export default function LeadsPage() {
  const { user, logout } = useAuth()

  const [meta, setMeta] = useState(null)
  const [stats, setStats] = useState(null)
  const [result, setResult] = useState(null) // { data, pagination }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const q = useDebounce(search.trim(), 300)

  const [modal, setModal] = useState(null) // { type: 'add' | 'edit' | 'delete', lead? }
  const [toast, setToast] = useState('')

  const loadStats = useCallback(() => {
    api.stats().then(setStats).catch(() => {}) // non-critical: the table is the primary view
  }, [])

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setError('Could not load form options.'))
    loadStats()
  }, [loadStats])

  // Fetch the current page. Aborting on change prevents slow, stale responses from overwriting newer ones.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api
      .listLeads({ q, status, sort, order, page, limit: PAGE_SIZE }, controller.signal)
      .then((res) => {
        // Deleting the last row of the last page leaves it empty: step back one page.
        if (res.data.length === 0 && res.pagination.page > res.pagination.totalPages) {
          setPage(res.pagination.totalPages)
          return
        }
        setResult(res)
        setError('')
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [q, status, sort, order, page, reloadKey])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const refresh = () => {
    setReloadKey((k) => k + 1)
    loadStats()
  }

  const changeStatus = (s) => {
    setStatus(s)
    setPage(1)
  }

  const onSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const onSort = (key) => {
    if (key === sort) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else {
      setSort(key)
      setOrder('asc')
    }
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    changeStatus('')
  }

  const closeModal = () => setModal(null)

  const onSaved = (lead, wasEdit) => {
    closeModal()
    setToast(wasEdit ? `Updated ${lead.name}` : `Added ${lead.name}`)
    refresh()
  }

  const onDeleted = (lead) => {
    closeModal()
    setToast(`Deleted ${lead.name}`)
    refresh()
  }

  const filtersActive = Boolean(search || status)
  const leads = result?.data ?? []

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Lead Manager</h1>
        <div className="topbar-user">
          <span className="muted">{user.name}</span>
          <button className="btn small" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main>
        <StatsBar stats={stats} activeStatus={status} onSelect={changeStatus} />

        <div className="toolbar">
          <input
            type="search"
            className="search"
            placeholder="Search by name, email or company…"
            aria-label="Search leads"
            value={search}
            onChange={onSearch}
          />
          <select aria-label="Filter by status" value={status} onChange={(e) => changeStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(meta?.statuses ?? []).map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn primary" onClick={() => setModal({ type: 'add' })} disabled={!meta}>+ Add lead</button>
        </div>

        {error && (
          <div className="alert" role="alert">
            {error} <button className="link" onClick={refresh}>Retry</button>
          </div>
        )}

        <section className={`card table-card${loading ? ' is-loading' : ''}`} aria-busy={loading}>
          {!result && loading ? (
            <p className="empty muted">Loading leads…</p>
          ) : leads.length === 0 ? (
            <div className="empty">
              {filtersActive ? (
                <>
                  <p>No leads match your search.</p>
                  <button className="btn" onClick={clearFilters}>Clear filters</button>
                </>
              ) : (
                <>
                  <p>No leads yet. Add your first one to get started.</p>
                  <button className="btn primary" onClick={() => setModal({ type: 'add' })} disabled={!meta}>+ Add lead</button>
                </>
              )}
            </div>
          ) : (
            <LeadsTable
              leads={leads}
              sort={sort}
              order={order}
              onSort={onSort}
              onEdit={(lead) => setModal({ type: 'edit', lead })}
              onDelete={(lead) => setModal({ type: 'delete', lead })}
            />
          )}
        </section>

        {result && <Pagination pagination={result.pagination} onPage={setPage} />}
      </main>

      {modal?.type === 'add' && <LeadForm meta={meta} onSaved={onSaved} onClose={closeModal} />}
      {modal?.type === 'edit' && <LeadForm lead={modal.lead} meta={meta} onSaved={onSaved} onClose={closeModal} />}
      {modal?.type === 'delete' && <ConfirmDelete lead={modal.lead} onDeleted={onDeleted} onClose={closeModal} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
