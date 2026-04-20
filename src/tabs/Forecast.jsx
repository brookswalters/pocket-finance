import { useState, useEffect } from 'react'
import { getLiveBalance, getPaydays, getBills, getLoans, getSettings } from '../store'

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function monthEnd(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m, 0).toISOString().slice(0, 10)
}

function generateForecastRows(weeks = 12) {
  const today = todayStr()
  const endDate = addDays(today, weeks * 7)

  const balance = getLiveBalance()
  const settings = getSettings()
  const bills = getBills()
  const loans = getLoans()
  const paydays = getPaydays(addDays(today, 1), endDate)

  // Build event list: { date, label, amount, type }
  const events = []

  // Paydays
  paydays.forEach(date => {
    events.push({ date, label: 'Paycheck', amount: settings.payAmount, type: 'income' })
  })

  // Bills — next occurrence of each bill's due date within range
  bills.forEach(bill => {
    let d = new Date(today + 'T00:00:00')
    // Walk through months and add each due date in range
    for (let mo = 0; mo < Math.ceil(weeks / 4) + 1; mo++) {
      const yr  = d.getFullYear()
      const mon = d.getMonth()
      const lastDay = new Date(yr, mon + 1, 0).getDate()
      const day = Math.min(bill.dueDay, lastDay)
      const dateStr = `${yr}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (dateStr > today && dateStr <= endDate) {
        events.push({ date: dateStr, label: bill.name, amount: bill.amount, type: 'bill' })
      }
      d = new Date(yr, mon + 1, 1)
    }
  })

  // Loans — 1st of each month
  loans.forEach(loan => {
    let d = new Date(today + 'T00:00:00')
    for (let mo = 0; mo < Math.ceil(weeks / 4) + 1; mo++) {
      const yr  = d.getFullYear()
      const mon = d.getMonth()
      const dateStr = `${yr}-${String(mon + 1).padStart(2, '0')}-01`
      if (dateStr > today && dateStr <= endDate) {
        events.push({ date: dateStr, label: loan.name, amount: loan.monthlyPayment, type: 'loan' })
      }
      d = new Date(yr, mon + 1, 1)
    }
  })

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date))

  // Build rows with running balance
  let running = balance
  const rows = []
  for (const ev of events) {
    if (ev.type === 'income') running += ev.amount
    else running -= ev.amount
    rows.push({ ...ev, balance: Math.round(running * 100) / 100 })
  }

  return rows
}

// Simple SVG line chart
function LineChart({ rows }) {
  if (rows.length < 2) return null

  const W = 340
  const H = 120
  const PAD = { top: 10, bottom: 20, left: 48, right: 8 }

  const balances = rows.map(r => r.balance)
  const minB = Math.min(...balances, 0)
  const maxB = Math.max(...balances)
  const range = maxB - minB || 1

  function x(i) { return PAD.left + (i / (rows.length - 1)) * (W - PAD.left - PAD.right) }
  function y(b) { return PAD.top + (1 - (b - minB) / range) * (H - PAD.top - PAD.bottom) }

  const pts = rows.map((r, i) => `${x(i)},${y(r.balance)}`).join(' ')
  const area = `M${x(0)},${y(rows[0].balance)} ` +
    rows.slice(1).map((r, i) => `L${x(i + 1)},${y(r.balance)}`).join(' ') +
    ` L${x(rows.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`

  // Y-axis labels
  const yLabels = [minB, (minB + maxB) / 2, maxB].map(v => ({
    v, y: y(v), label: v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`,
  }))

  // Zero line
  const zeroY = y(0)
  const showZero = minB < 0 && maxB > 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={area} fill="url(#fg)" />
      {/* Zero line */}
      {showZero && <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />}
      {/* Line */}
      <polyline points={pts} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Y labels */}
      {yLabels.map(l => (
        <text key={l.label} x={PAD.left - 4} y={l.y + 4} textAnchor="end" fontSize={9} fill="#64748b">{l.label}</text>
      ))}
    </svg>
  )
}

export default function Forecast() {
  const [rows, setRows] = useState([])
  const [weeks, setWeeks] = useState(12)

  useEffect(() => {
    setRows(generateForecastRows(weeks))
  }, [weeks])

  const lowestBalance = rows.length ? Math.min(...rows.map(r => r.balance)) : 0
  const highestBalance = rows.length ? Math.max(...rows.map(r => r.balance)) : 0
  const totalIncome = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalOut = rows.filter(r => r.type !== 'income').reduce((s, r) => s + r.amount, 0)

  const typeColor = { income: 'text-emerald-400', bill: 'text-red-400', loan: 'text-amber-400' }
  const typeBg    = { income: 'bg-emerald-500/20', bill: 'bg-red-500/20', loan: 'bg-amber-500/20' }
  const typeLabel = { income: 'Pay', bill: 'Bill', loan: 'Loan' }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Forecast</h1>
          {/* Weeks toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            {[4, 8, 12].map(w => (
              <button key={w} onClick={() => setWeeks(w)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${weeks === w ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
                {w}w
              </button>
            ))}
          </div>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Income</p>
            <p className="text-emerald-400 font-semibold text-sm mt-0.5">+{fmt(totalIncome)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Out</p>
            <p className="text-red-400 font-semibold text-sm mt-0.5">−{fmt(totalOut)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Low Point</p>
            <p className={`font-semibold text-sm mt-0.5 ${lowestBalance < 0 ? 'text-red-400' : 'text-white'}`}>
              {fmt(lowestBalance)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-800 rounded-2xl px-3 pt-3 pb-1">
          <LineChart rows={rows} />
        </div>
      </div>

      {/* Cash flow table */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Cash Flow</p>
        {rows.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No upcoming events</p>
        ) : (
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
            {rows.map((row, i) => {
              const date = new Date(row.date + 'T00:00:00')
              const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const dayLabel  = date.toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {/* Date */}
                  <div className="w-10 shrink-0 text-center">
                    <p className="text-slate-500 text-[10px]">{dayLabel}</p>
                    <p className="text-white text-xs font-medium">{dateLabel}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeBg[row.type]} ${typeColor[row.type]}`}>
                    {typeLabel[row.type]}
                  </span>

                  {/* Label */}
                  <p className="flex-1 text-slate-300 text-sm truncate">{row.label}</p>

                  {/* Amount + running balance */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${typeColor[row.type]}`}>
                      {row.type === 'income' ? '+' : '−'}{fmt(row.amount)}
                    </p>
                    <p className={`text-xs ${row.balance < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {fmt(row.balance)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
