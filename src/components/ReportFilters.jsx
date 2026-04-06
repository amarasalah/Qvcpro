import { useState } from 'react'
import { Calendar, Filter, RotateCcw, SlidersHorizontal } from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les statuts', color: '#94a3b8' },
  { value: 'conforming', label: 'Conforme', color: '#22c55e' },
  { value: 'nonConforming', label: 'Non conforme', color: '#f97316' },
  { value: 'pending', label: 'À vérifier', color: '#94a3b8' },
]

export default function ReportFilters({
  dateFrom,
  dateTo,
  statusFilter,
  sectionFilter,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onSectionChange,
  onReset,
  sections = [],
  showSectionFilter = true,
}) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const hasActiveFilters =
    dateFrom || dateTo || statusFilter !== 'all' || (sectionFilter && sectionFilter !== 'all')

  return (
    <div className="report-filters">
      <div className="report-filters-toggle">
        <button
          className="filter-toggle-btn"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <SlidersHorizontal size={14} />
          <span>Filtres</span>
          {hasActiveFilters && <span className="filter-badge" />}
        </button>
        {hasActiveFilters && (
          <button className="filter-reset-btn" onClick={onReset} type="button">
            <RotateCcw size={12} />
            Réinitialiser
          </button>
        )}
      </div>

      {expanded && (
        <div className="report-filters-row">
          {/* Date From */}
          <label className="report-filter-field">
            <span><Calendar size={10} /> Du</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              max={dateTo || today}
            />
          </label>

          {/* Date To */}
          <label className="report-filter-field">
            <span><Calendar size={10} /> Au</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              min={dateFrom || undefined}
              max={today}
            />
          </label>

          {/* Status Filter */}
          <label className="report-filter-field">
            <span><Filter size={10} /> Statut</span>
            <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          {/* Section Filter */}
          {showSectionFilter && sections.length > 0 && (
            <label className="report-filter-field">
              <span><Filter size={10} /> Section</span>
              <select value={sectionFilter} onChange={(e) => onSectionChange(e.target.value)}>
                <option value="all">Toutes les sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.shortTitle}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Print-only filter summary */}
      {hasActiveFilters && (
        <div className="print-filter-summary">
          <strong>Filtres appliqués :</strong>
          {dateFrom && <span>Du {dateFrom}</span>}
          {dateTo && <span>Au {dateTo}</span>}
          {statusFilter !== 'all' && (
            <span>Statut : {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}</span>
          )}
          {sectionFilter && sectionFilter !== 'all' && (
            <span>Section : {sections.find((s) => s.id === sectionFilter)?.shortTitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
