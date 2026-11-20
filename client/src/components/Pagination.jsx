export default function Pagination({ pagination, onPage }) {
  const { page, limit, total, totalPages } = pagination
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">Showing {from}–{to} of {total}</span>
      <div>
        <button className="btn small" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</button>
        <span className="page-indicator">Page {page} of {totalPages}</span>
        <button className="btn small" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>
    </nav>
  )
}
