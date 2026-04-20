import { useState, useEffect } from 'react'
import { getGolf, saveGolf, addGolfVisit, deleteGolfVisit, getGolfBreakEven } from '../store'
import BottomSheet from '../components/BottomSheet'

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// SVG value chart — cumulative value vs break-even line
function ValueChart({ visits, membershipCost }) {
  if (visits.length === 0) return (
    <div className="flex items-center justify-center h-24 text-slate-600 text-sm">Log a visit to see your value chart</div>
  )

  const W = 320
  const H = 110
  const PAD = { top: 12, bottom: 24, left: 44, right: 12 }

  // Build cumulative series — add a zero point at the start
  const sorted = [...visits].sort((a, b) => a.date.localeCompare(b.date))
  const points = [{ label: 'Start', cumulative: 0 }]
  let cum = 0
  sorted.forEach((v, i) => {
    cum += v.price
    points.push({ label: `#${i + 1}`, cumulative: cum })
  })

  const maxVal = Math.max(cum, membershipCost) * 1.05
  const n = points.length

  function px(i) { return PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right) }
  function py(v) { return PAD.top + (1 - v / maxVal) * (H - PAD.top - PAD.bottom) }

  const lineStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(p.cumulative)}`).join(' ')
  const areaStr = lineStr + ` L${px(n - 1)},${H - PAD.bottom} L${px(0)},${H - PAD.bottom} Z`

  const breakY = py(membershipCost)
  const crossedIdx = points.findIndex(p => p.cumulative >= membershipCost)

  const yLabels = [0, membershipCost / 2, membershipCost].map(v => ({
    v, y: py(v),
    label: v === 0 ? '$0' : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`,
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="golfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaStr} fill="url(#golfGrad)" />

      {/* Break-even line */}
      <line x1={PAD.left} x2={W - PAD.right} y1={breakY} y2={breakY}
        stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={W - PAD.right - 2} y={breakY - 4} textAnchor="end" fontSize={8} fill="#10b981">Break-even</text>

      {/* Value line */}
      <path d={lineStr} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Crossover dot */}
      {crossedIdx > 0 && (
        <circle cx={px(crossedIdx)} cy={py(points[crossedIdx].cumulative)} r={4}
          fill="#10b981" stroke="#0f172a" strokeWidth={1.5} />
      )}

      {/* Y labels */}
      {yLabels.map(l => (
        <text key={l.label} x={PAD.left - 4} y={l.y + 3} textAnchor="end" fontSize={8} fill="#64748b">{l.label}</text>
      ))}

      {/* X axis visit count */}
      {n > 1 && [0, n - 1].map(i => (
        <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize={8} fill="#64748b">
          {i === 0 ? 'Start' : `${n - 1} visits`}
        </text>
      ))}
    </svg>
  )
}

export default function Golf() {
  const [golf, setGolf] = useState(null)
  const [breakEven, setBreakEven] = useState({ totalSpent: 0, remaining: 554, pct: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ date: todayStr(), typeId: 'holes18', price: '', notes: '' })

  useEffect(() => { load() }, [])

  function load() {
    const g = getGolf()
    setGolf(g)
    setBreakEven(getGolfBreakEven())
    // Default form price to first active type
    const active = g.visitTypes.find(t => t.active)
    if (active) setForm(f => ({ ...f, typeId: active.id, price: String(active.price) }))
  }

  function handleTypeChange(typeId) {
    const vt = golf.visitTypes.find(t => t.id === typeId)
    setForm(f => ({ ...f, typeId, price: vt?.price ? String(vt.price) : '' }))
  }

  function handleAddVisit(e) {
    e.preventDefault()
    const vt = golf.visitTypes.find(t => t.id === form.typeId)
    addGolfVisit({
      date: form.date,
      typeId: form.typeId,
      label: vt?.label ?? form.typeId,
      price: parseFloat(form.price) || 0,
      notes: form.notes,
    })
    setShowAdd(false)
    setForm(f => ({ ...f, date: todayStr(), notes: '' }))
    load()
  }

  function handleDelete(id) {
    deleteGolfVisit(id)
    load()
  }

  if (!golf) return null

  const sortedVisits = [...golf.visits].sort((a, b) => b.date.localeCompare(a.date))
  const totalValue = golf.visits.reduce((s, v) => s + v.price, 0)
  const breakevenReached = totalValue >= golf.membershipCost
  const visitsCount = golf.visits.length
  const avgCost = visitsCount > 0 ? totalValue / visitsCount : 0

  const barColor = breakevenReached ? '#10b981' : breakEven.pct > 70 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Golf Tracker</h1>
          <button onClick={() => setShowAdd(true)}
            className="bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
            + Log Visit
          </button>
        </div>

        {/* Membership card */}
        <div className="bg-slate-800 rounded-2xl p-4 mb-3">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs">Membership Cost</p>
              <p className="text-white text-2xl font-bold">{fmt(golf.membershipCost)}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                Paid {new Date(golf.membershipPaidDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${breakevenReached ? 'text-emerald-400' : 'text-white'}`}>
                {breakevenReached ? '🎉' : fmt(breakEven.remaining)}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {breakevenReached ? 'Broken even!' : 'left to recover'}
              </p>
            </div>
          </div>

          {/* Countdown bar — full = no visits, empty = broken even */}
          <div className="mb-1.5">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{fmt(totalValue)} recovered via {visitsCount} visit{visitsCount !== 1 ? 's' : ''}</span>
              {visitsCount > 0 && <span className="text-slate-500">~{fmt(avgCost)}/round</span>}
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              {/* Bar shrinks as you recover value */}
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${100 - breakEven.pct}%`,
                  backgroundColor: barColor,
                  marginLeft: `${breakEven.pct}%`,
                  transition: 'all 0.5s ease',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-emerald-500">{fmt(totalValue)} ✓</span>
              <span className="text-slate-500">{fmt(golf.membershipCost)}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {golf.visitTypes.filter(t => t.active).map(vt => {
            const count = golf.visits.filter(v => v.typeId === vt.id).length
            return (
              <div key={vt.id} className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-lg">{count}</p>
                <p className="text-slate-500 text-xs mt-0.5">{vt.label}</p>
                <p className="text-blue-400 text-xs">{fmt(vt.price)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 flex flex-col gap-4">

        {/* Value chart */}
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Value Chart</p>
          <div className="bg-slate-800 rounded-2xl px-3 pt-3 pb-2">
            <ValueChart visits={golf.visits} membershipCost={golf.membershipCost} />
          </div>
        </div>

        {/* Visit log */}
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Visit Log</p>
          {sortedVisits.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">No visits yet</p>
              <button onClick={() => setShowAdd(true)} className="text-blue-400 text-sm mt-2">+ Log your first visit</button>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
              {sortedVisits.map((visit, i) => (
                <div key={visit.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{visit.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(visit.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {visit.notes ? ` · ${visit.notes}` : ''}
                    </p>
                  </div>
                  <p className="text-blue-400 font-semibold text-sm shrink-0">{fmt(visit.price)}</p>
                  <button
                    onPointerDown={() => handleDelete(visit.id)}
                    className="text-slate-600 p-1 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log visit sheet */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Log Visit">
        <form onSubmit={handleAddVisit} className="flex flex-col gap-3">
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm" />

          {/* Visit type buttons */}
          <div>
            <p className="text-slate-400 text-xs mb-2">Visit type</p>
            <div className="grid grid-cols-3 gap-2">
              {golf.visitTypes.map(vt => (
                <button
                  key={vt.id}
                  type="button"
                  disabled={!vt.active}
                  onClick={() => handleTypeChange(vt.id)}
                  className={`py-3 rounded-xl text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
                    !vt.active ? 'bg-slate-700/30 text-slate-600' :
                    form.typeId === vt.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <span>{vt.label}</span>
                  {vt.active ? (
                    <span className="text-[10px] opacity-70">{fmt(vt.price)}</span>
                  ) : (
                    <span className="text-[10px] opacity-50">{vt.note ?? 'Inactive'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs mb-1">Price paid</p>
            <input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
          </div>

          <input type="text" placeholder="Notes (optional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

          <button type="submit"
            className="w-full bg-blue-500 text-white font-semibold rounded-xl py-3">
            Save Visit
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
