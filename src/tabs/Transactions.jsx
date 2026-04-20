import { useState, useEffect, useRef } from 'react'
import {
  getTransactionsWithBalance, addTransaction, deleteTransaction,
  CATEGORIES, autoCategorize,
} from '../store'
import DonutChart from '../components/DonutChart'
import BottomSheet from '../components/BottomSheet'

function fmt(n) {
  return Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const CAT_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6b7280',
  '#14b8a6','#a855f7','#eab308','#64748b',
]

// ── Swipeable row ──────────────────────────────────────────────────────────────
function SwipeRow({ onDelete, children }) {
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef(null)

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
  }

  function onTouchMove(e) {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffsetX(Math.max(dx, -80))
  }

  function onTouchEnd() {
    if (offsetX < -50) setOffsetX(-72)
    else setOffsetX(0)
    startX.current = null
  }

  function handleDelete() {
    setOffsetX(0)
    onDelete()
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-[72px] bg-red-500 flex items-center justify-center">
        <button onPointerDown={handleDelete} className="flex flex-col items-center gap-0.5 text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>
      <div
        style={{ transform: `translateX(${offsetX}px)`, transition: startX.current ? 'none' : 'transform 0.2s ease' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// ── CSV Parser ─────────────────────────────────────────────────────────────────
function parseCSV(raw) {
  const lines = raw.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  const header = lines[0].toLowerCase().split(',').map(h => h.replace(/['"]/g, '').trim())
  const colDate = header.findIndex(h => ['date','transaction date','trans date','posted date'].includes(h))
  const colDesc = header.findIndex(h => ['description','memo','name','payee','merchant'].includes(h))
  const colAmt  = header.findIndex(h => ['amount','debit','credit','transaction amount'].includes(h))

  if (colDate === -1 || colDesc === -1 || colAmt === -1) return null

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.replace(/['"]/g, '').trim())
    const rawAmt = parseFloat(cols[colAmt]?.replace(/[$,]/g, '') ?? '0')
    const amt = Math.abs(rawAmt)
    const type = rawAmt < 0 ? 'expense' : 'income'
    const desc = cols[colDesc] ?? ''
    const date = cols[colDate] ?? todayStr()
    let isoDate = date
    try {
      const d = new Date(date)
      if (!isNaN(d)) isoDate = d.toISOString().slice(0, 10)
    } catch {}
    return { date: isoDate, desc, amt, cat: autoCategorize(desc), type }
  }).filter(t => t.amt > 0)
}

// ── Add / Import Sheet ─────────────────────────────────────────────────────────
function AddSheet({ open, onClose, onSaved }) {
  const [tab, setTab] = useState('manual')
  const [form, setForm] = useState({ date: todayStr(), desc: '', amt: '', cat: 'Other', type: 'expense' })
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState(null)
  const [parseError, setParseError] = useState(false)
  const fileRef = useRef()

  function resetForm() {
    setForm({ date: todayStr(), desc: '', amt: '', cat: 'Other', type: 'expense' })
    setCsvText(''); setPreview(null); setParseError(false); setTab('manual')
  }

  function handleClose() { resetForm(); onClose() }

  function saveManual(e) {
    e.preventDefault()
    if (!form.desc || !form.amt) return
    addTransaction({ ...form, amt: parseFloat(form.amt) })
    onSaved()
    handleClose()
  }

  function handleCSVParse() {
    const result = parseCSV(csvText)
    if (!result) { setParseError(true); setPreview(null); return }
    setParseError(false)
    setPreview(result)
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCsvText(ev.target.result); setPreview(null) }
    reader.readAsText(file)
  }

  function confirmImport() {
    const existing = getTransactionsWithBalance()
    for (const t of preview) {
      const dup = existing.some(e =>
        e.date === t.date && Math.abs(e.amt - t.amt) < 0.01 && e.desc.toLowerCase() === t.desc.toLowerCase()
      )
      if (!dup) addTransaction(t)
    }
    onSaved()
    handleClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Add Transaction">
      <div className="flex bg-slate-700/50 rounded-xl p-1 mb-4">
        {['manual','csv'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
            {t === 'manual' ? 'Manual' : 'Import CSV'}
          </button>
        ))}
      </div>

      {tab === 'manual' ? (
        <form onSubmit={saveManual} className="flex flex-col gap-3">
          <div className="flex bg-slate-700/50 rounded-xl p-1">
            {['expense','income'].map(type => (
              <button key={type} type="button" onClick={() => setForm(f => ({ ...f, type }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  form.type === type
                    ? type === 'expense' ? 'bg-red-500/80 text-white' : 'bg-emerald-500/80 text-white'
                    : 'text-slate-400'
                }`}>
                {type}
              </button>
            ))}
          </div>

          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm" />

          <input type="text" placeholder="Description" value={form.desc}
            onChange={e => {
              const desc = e.target.value
              setForm(f => ({ ...f, desc, cat: autoCategorize(desc) || f.cat }))
            }}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

          <input type="number" placeholder="Amount" inputMode="decimal" step="0.01" min="0" value={form.amt}
            onChange={e => setForm(f => ({ ...f, amt: e.target.value }))}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

          <select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button type="submit" className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3 mt-1">
            Save Transaction
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-slate-400 text-sm">Paste CSV or upload a file. Date, Description, and Amount columns are auto-detected.</p>

          <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setPreview(null) }}
            placeholder="Paste CSV here…" rows={5}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-xs placeholder-slate-500 font-mono" />

          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm">
              Upload file
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <button onClick={handleCSVParse} disabled={!csvText.trim()}
              className="flex-1 bg-blue-500/80 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40">
              Preview
            </button>
          </div>

          {parseError && (
            <p className="text-red-400 text-xs">Could not detect columns. CSV must have Date, Description, and Amount headers.</p>
          )}

          {preview && (
            <>
              <p className="text-slate-400 text-xs">{preview.length} rows found — categories auto-detected. Duplicates will be skipped.</p>
              <div className="bg-slate-700/50 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {preview.slice(0, 20).map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{t.desc}</p>
                      <p className="text-slate-500 text-[10px]">{t.date} · {t.cat}</p>
                    </div>
                    <p className={`text-xs font-semibold shrink-0 ml-2 ${t.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {t.type === 'expense' ? '−' : '+'}{fmt(t.amt)}
                    </p>
                  </div>
                ))}
                {preview.length > 20 && <p className="text-slate-500 text-xs text-center py-2">+{preview.length - 20} more</p>}
              </div>
              <button onClick={confirmImport}
                className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3">
                Import {preview.length} Transactions
              </button>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Transactions() {
  const [allTxns, setAllTxns] = useState([])
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState(todayStr().slice(0, 7))
  const [filterCat, setFilterCat] = useState('All')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { load() }, [])

  function load() { setAllTxns(getTransactionsWithBalance()) }

  function handleDelete(id) { deleteTransaction(id); load() }

  const filtered = allTxns.filter(t => {
    const matchMonth  = !filterMonth || t.date.startsWith(filterMonth)
    const matchCat    = filterCat === 'All' || t.cat === filterCat
    const matchSearch = !search || t.desc.toLowerCase().includes(search.toLowerCase())
    return matchMonth && matchCat && matchSearch
  })

  const income   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amt, 0)
  const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amt, 0)
  const net      = income - expenses

  const catMap = {}
  filtered.filter(t => t.type === 'expense').forEach(t => { catMap[t.cat] = (catMap[t.cat] ?? 0) + t.amt })
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const donutSegments = catEntries.map(([cat, val], i) => ({ value: val, color: CAT_COLORS[i % CAT_COLORS.length], label: cat }))

  const months = [...new Set(allTxns.map(t => t.date.slice(0, 7)))].sort().reverse()
  const cats   = ['All', ...new Set(filtered.map(t => t.cat))]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Transactions</h1>
          <div className="flex gap-2">
            <button onClick={() => setView(v => v === 'list' ? 'chart' : 'list')}
              className="bg-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium">
              {view === 'list' ? '📊 Chart' : '☰ List'}
            </button>
            <button onClick={() => setShowAdd(true)}
              className="bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
              + Add
            </button>
          </div>
        </div>

        <div className="relative mb-2">
          <input type="search" placeholder="Search transactions…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-slate-500" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="bg-slate-800 text-white rounded-lg px-3 py-1.5 text-xs shrink-0">
            <option value="">All time</option>
            {months.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          {cats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterCat === cat ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'chart' ? (
          <div className="p-4 flex flex-col gap-4">
            {catEntries.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No expense data for this period</p>
            ) : (
              <>
                <div className="flex justify-center py-2">
                  <DonutChart segments={donutSegments} size={160} thickness={28}>
                    <p className="text-white font-bold text-lg">{fmt(expenses)}</p>
                    <p className="text-slate-400 text-xs">spent</p>
                  </DonutChart>
                </div>
                <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50">
                  {catEntries.map(([cat, val], i) => (
                    <div key={cat} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="flex-1 text-slate-300 text-sm">{cat}</span>
                      <span className="text-white font-medium text-sm">{fmt(val)}</span>
                      <span className="text-slate-500 text-xs w-10 text-right">{((val / expenses) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-slate-500 text-sm">No transactions found</p>
            <button onClick={() => setShowAdd(true)} className="text-emerald-400 text-sm">+ Add one</button>
          </div>
        ) : (
          <div className="bg-slate-800 mx-4 mt-3 rounded-2xl overflow-hidden divide-y divide-slate-700/50">
            {filtered.map(t => (
              <SwipeRow key={t.id} onDelete={() => handleDelete(t.id)}>
                <div className="flex items-center justify-between px-4 py-3 gap-3 bg-slate-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.desc}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{t.cat}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold text-sm ${t.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {t.type === 'expense' ? '−' : '+'}{fmt(t.amt)}
                    </p>
                    <p className="text-slate-500 text-xs">{fmt(t.runningBalance)}</p>
                  </div>
                </div>
              </SwipeRow>
            ))}
          </div>
        )}

        {/* Monthly summary */}
        <div className="mx-4 mt-3 mb-6 bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
            {filterMonth
              ? new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : 'All Time'} Summary
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-slate-500 text-xs">Income</p>
              <p className="text-emerald-400 font-semibold text-sm mt-0.5">{fmt(income)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Spent</p>
              <p className="text-red-400 font-semibold text-sm mt-0.5">{fmt(expenses)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Net</p>
              <p className={`font-semibold text-sm mt-0.5 ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {net >= 0 ? '+' : ''}{fmt(Math.abs(net))}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AddSheet open={showAdd} onClose={() => setShowAdd(false)} onSaved={load} />
    </div>
  )
}
