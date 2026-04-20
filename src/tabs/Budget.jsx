import { useState, useEffect } from 'react'
import {
  getBudgetCategories, saveBudgetCategories, getBudgetActuals, CATEGORIES,
} from '../store'
import BottomSheet from '../components/BottomSheet'

function fmt(n) {
  return Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

const CAT_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6b7280',
  '#14b8a6','#a855f7','#eab308','#64748b',
]

const BLANK_CAT = { name: '', budgeted: '', color: '#10b981' }

export default function Budget() {
  const [cats, setCats] = useState([])
  const [month, setMonth] = useState(currentMonth())
  const [actuals, setActuals] = useState({})
  const [editCat, setEditCat] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'chart'

  useEffect(() => {
    setCats(getBudgetCategories())
    setActuals(getBudgetActuals(month))
  }, [month])

  function refresh() {
    setCats(getBudgetCategories())
    setActuals(getBudgetActuals(month))
  }

  function handleSave(form) {
    const all = getBudgetCategories()
    if (form.id) {
      saveBudgetCategories(all.map(c => c.id === form.id ? form : c))
    } else {
      saveBudgetCategories([...all, { ...form, id: crypto.randomUUID() }])
    }
    setEditCat(null)
    refresh()
  }

  function handleDelete(id) {
    saveBudgetCategories(getBudgetCategories().filter(c => c.id !== id))
    setEditCat(null)
    refresh()
  }

  const totalBudgeted = cats.reduce((s, c) => s + c.budgeted, 0)
  const totalSpent    = cats.reduce((s, c) => s + (actuals[c.name] ?? 0), 0)
  const totalLeft     = totalBudgeted - totalSpent

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    setMonth(new Date(y, m - 2, 1).toISOString().slice(0, 7))
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    setMonth(new Date(y, m, 1).toISOString().slice(0, 7))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Budget</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView(v => v === 'list' ? 'chart' : 'list')}
              className="bg-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              {view === 'list' ? '📊 Chart' : '☰ List'}
            </button>
            <button
              onClick={() => setEditCat(BLANK_CAT)}
              className="bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-2.5 mb-3">
          <button onClick={prevMonth} className="text-slate-400 text-lg px-1">‹</button>
          <span className="text-white font-medium text-sm">{monthLabel}</span>
          <button onClick={nextMonth} className="text-slate-400 text-lg px-1">›</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Budgeted</p>
            <p className="text-white font-semibold text-sm mt-0.5">{fmt(totalBudgeted)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Spent</p>
            <p className="text-red-400 font-semibold text-sm mt-0.5">{fmt(totalSpent)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Left</p>
            <p className={`font-semibold text-sm mt-0.5 ${totalLeft >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalLeft < 0 ? '−' : ''}{fmt(totalLeft)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {view === 'chart' ? (
          <ChartView cats={cats} actuals={actuals} />
        ) : (
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
            {cats.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">No budget categories</p>
                <button onClick={() => setEditCat(BLANK_CAT)} className="text-emerald-400 text-sm mt-2">+ Add one</button>
              </div>
            ) : cats.map((cat, i) => {
              const spent   = actuals[cat.name] ?? 0
              const left    = cat.budgeted - spent
              const pct     = cat.budgeted > 0 ? Math.min((spent / cat.budgeted) * 100, 100) : 0
              const over    = spent > cat.budgeted
              const barColor = over ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color

              return (
                <div key={cat.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <p className="text-white text-sm font-medium truncate">{cat.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${over ? 'text-red-400' : 'text-white'}`}>
                          {fmt(spent)} <span className="text-slate-500 font-normal text-xs">/ {fmt(cat.budgeted)}</span>
                        </p>
                        <p className={`text-xs ${over ? 'text-red-400' : 'text-slate-400'}`}>
                          {over ? `${fmt(Math.abs(left))} over` : `${fmt(left)} left`}
                        </p>
                      </div>
                      <button onPointerDown={() => setEditCat(cat)} className="text-slate-600 p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CatSheet cat={editCat} onClose={() => setEditCat(null)} onSave={handleSave} onDelete={handleDelete} />
    </div>
  )
}

function ChartView({ cats, actuals }) {
  const maxBudget = Math.max(...cats.map(c => c.budgeted), 1)

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      {cats.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">No categories yet</p>
      ) : cats.map((cat, i) => {
        const spent = actuals[cat.name] ?? 0
        const over  = spent > cat.budgeted
        const budgetPct = (cat.budgeted / maxBudget) * 100
        const spentPct  = (Math.min(spent, cat.budgeted) / maxBudget) * 100
        const overPct   = over ? ((spent - cat.budgeted) / maxBudget) * 100 : 0

        return (
          <div key={cat.id} className="px-4 py-3 border-b border-slate-700/50 last:border-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-300 text-xs font-medium truncate flex-1">{cat.name}</span>
              <span className={`text-xs font-semibold ml-2 ${over ? 'text-red-400' : 'text-slate-400'}`}>
                {fmt(spent)} / {fmt(cat.budgeted)}
              </span>
            </div>
            <div className="relative h-5 bg-slate-700 rounded-lg overflow-hidden">
              {/* Budget bar */}
              <div className="absolute left-0 top-0 bottom-0 rounded-lg opacity-30" style={{ width: `${budgetPct}%`, backgroundColor: cat.color }} />
              {/* Spent bar */}
              <div className="absolute left-0 top-0 bottom-0 rounded-lg" style={{ width: `${spentPct}%`, backgroundColor: over ? '#ef4444' : cat.color }} />
              {/* Over-budget bar */}
              {over && <div className="absolute top-0 bottom-0 rounded-r-lg bg-red-600" style={{ left: `${(cat.budgeted / maxBudget) * 100}%`, width: `${overPct}%` }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CatSheet({ cat, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(cat ?? BLANK_CAT)
  useEffect(() => { setForm(cat ?? BLANK_CAT) }, [cat])

  if (!cat) return null
  const isNew = !cat.id

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.budgeted) return
    onSave({ ...form, budgeted: parseFloat(form.budgeted) })
  }

  return (
    <BottomSheet open={!!cat} onClose={onClose} title={isNew ? 'Add Category' : 'Edit Category'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="text" placeholder="Category name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

        <input type="number" placeholder="Monthly budget" inputMode="decimal" step="1" min="0" value={form.budgeted}
          onChange={e => setForm(f => ({ ...f, budgeted: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

        {/* Color picker */}
        <div>
          <p className="text-slate-400 text-xs mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {CAT_COLORS.map(color => (
              <button key={color} type="button"
                onClick={() => setForm(f => ({ ...f, color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <button type="submit" className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3">
          {isNew ? 'Add Category' : 'Save Changes'}
        </button>

        {!isNew && (
          <button type="button" onClick={() => onDelete(cat.id)}
            className="w-full bg-red-500/20 text-red-400 font-semibold rounded-xl py-3">
            Delete Category
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
