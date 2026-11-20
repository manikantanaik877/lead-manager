const COLUMNS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'email', label: 'Contact' },
  { key: 'source', label: 'Source', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Added', sortable: true },
]

const formatDate = (s) => new Date(`${s.replace(' ', 'T')}Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
}

export default function LeadsTable({ leads, sort, order, onSort, onEdit, onDelete }) {
  const ariaSort = (key) => (sort === key ? (order === 'asc' ? 'ascending' : 'descending') : 'none')

  return (
    <div className="table-wrap">
      <table className="leads">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" aria-sort={c.sortable ? ariaSort(c.key) : undefined}>
                {c.sortable ? (
                  <button className="sort-btn" onClick={() => onSort(c.key)}>
                    {c.label}
                    <span className="sort-arrow" aria-hidden="true">{sort === c.key ? (order === 'asc' ? '▲' : '▼') : ''}</span>
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td data-label="Name"><strong>{lead.name}</strong></td>
              <td data-label="Company">{lead.company}</td>
              <td data-label="Contact">
                <div>
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  <div className="muted small">{lead.phone}</div>
                </div>
              </td>
              <td data-label="Source">{lead.source}</td>
              <td data-label="Status"><StatusBadge status={lead.status} /></td>
              <td data-label="Added" className="nowrap">{formatDate(lead.created_at)}</td>
              <td className="actions">
                <button className="btn small" onClick={() => onEdit(lead)} aria-label={`Edit ${lead.name}`}>Edit</button>
                <button className="btn small danger-outline" onClick={() => onDelete(lead)} aria-label={`Delete ${lead.name}`}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
