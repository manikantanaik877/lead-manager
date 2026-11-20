export default function StatsBar({ stats, activeStatus, onSelect }) {
  if (!stats) return <div className="stats" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="stat skeleton" />)}</div>

  const items = [{ key: '', label: 'Total', count: stats.total }, ...Object.entries(stats.byStatus).map(([key, count]) => ({ key, label: key, count }))]

  return (
    <section className="stats" aria-label="Lead counts by status">
      {items.map(({ key, label, count }) => (
        <button
          key={label}
          className={`stat${activeStatus === key ? ' active' : ''}`}
          data-status={key || 'All'}
          onClick={() => onSelect(key)}
          aria-pressed={activeStatus === key}
        >
          <span className="stat-count">{count}</span>
          <span className="stat-label">{label}</span>
        </button>
      ))}
    </section>
  )
}
