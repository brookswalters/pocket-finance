import { useState, useEffect, useRef } from 'react'
import {
  getPaydays, getBills, getTransactions, getGolf,
} from '../store'

function fmt(n) {
  return Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function pad(n) { return String(n).padStart(2, '0') }

function monthStart(year, month) { return new Date(year, month, 1) }
function monthEnd(year, month)   { return new Date(year, month + 1, 0) }

function isoDate(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

// Build all events for a given month
function buildEvents(year, month) {
  const firstDay = isoDate(year, month, 1)
  const lastDay  = isoDate(year, month, monthEnd(year, month).getDate())

  const events = {}

  const addEvent = (date, ev) => {
    if (!events[date]) events[date] = []
    events[date].push(ev)
  }

  // Paydays
  getPaydays(firstDay, lastDay).forEach(date => {
    addEvent(date, { type: 'payday', label: 'Payday', color: '#10b981' })
  })

  // Bills
  getBills().forEach(bill => {
    const lastDayOfMonth = monthEnd(year, month).getDate()
    const day = Math.min(bill.dueDay, lastDayOfMonth)
    const date = isoDate(year, month, day)
    addEvent(date, { type: 'bill', label: bill.name, amount: bill.amount, color: '#ef4444' })
  })

  // Transactions
  getTransactions()
    .filter(t => t.date >= firstDay && t.date <= lastDay)
    .forEach(t => {
      addEvent(t.date, {
        type: 'transaction',
        label: t.desc,
        amount: t.amt,
        txType: t.type,
        color: t.type === 'income' ? '#10b981' : '#94a3b8',
      })
    })

  // Golf visits
  const golf = getGolf()
  golf.visits
    .filter(v => v.date >= firstDay && v.date <= lastDay)
    .forEach(v => {
      addEvent(v.date, { type: 'golf', label: v.label ?? 'Golf', amount: v.price, color: '#3b82f6' })
    })

  return events
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const TYPE_DOT = {
  payday:      '#10b981',
  bill:        '#ef4444',
  transaction: '#94a3b8',
  golf:        '#3b82f6',
}

export default function Calendar() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState({})
  const [selected, setSelected] = useState(null) // date string
  const touchStartX = useRef(null)

  useEffect(() => {
    setEvents(buildEvents(year, month))
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -60) nextMonth()
    else if (dx > 60) prevMonth()
    touchStartX.current = null
  }

  const first = monthStart(year, month)
  const last  = monthEnd(year, month)
  const startOffset = first.getDay() // 0=Sun
  const totalDays = last.getDate()

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  // Build grid cells
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedEvents = selected ? (events[selected] ?? []) : []

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="text-slate-400 text-2xl px-2 py-1">‹</button>
          <h1 className="text-white text-lg font-bold">{monthLabel}</h1>
          <button onClick={nextMonth} className="text-slate-400 text-2xl px-2 py-1">›</button>
        </div>

        {/* Day name headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-slate-500 text-xs font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const dateStr = isoDate(year, month, day)
            const dayEvents = events[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selected

            // Unique event types for dot display
            const dotTypes = [...new Set(dayEvents.map(e => e.type))]

            return (
              <button
                key={dateStr}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                  isSelected ? 'bg-slate-600' : isToday ? 'bg-slate-700/60' : ''
                }`}
              >
                <span className={`text-sm font-medium leading-none ${
                  isToday ? 'text-emerald-400' : isSelected ? 'text-white' : 'text-slate-300'
                }`}>
                  {day}
                </span>
                {/* Event dots */}
                <div className="flex gap-0.5 mt-1 h-1.5">
                  {dotTypes.slice(0, 3).map(type => (
                    <div
                      key={type}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: TYPE_DOT[type] }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 justify-center flex-wrap">
          {[
            { label: 'Payday',  color: '#10b981' },
            { label: 'Bill',    color: '#ef4444' },
            { label: 'Golf',    color: '#3b82f6' },
            { label: 'Transaction', color: '#94a3b8' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-slate-500 text-xs">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail / event list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {selected ? (
          <>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {selectedEvents.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl p-6 text-center">
                <p className="text-slate-500 text-sm">Nothing on this day</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
                {selectedEvents.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{ev.label}</p>
                      <p className="text-slate-500 text-xs capitalize mt-0.5">{ev.type}</p>
                    </div>
                    {ev.amount != null && (
                      <p className={`text-sm font-semibold shrink-0 ${
                        ev.type === 'payday' || ev.txType === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {ev.type === 'payday' || ev.txType === 'income' ? '+' : '−'}{fmt(ev.amount)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Upcoming</p>
            <UpcomingList events={events} todayStr={todayStr} year={year} month={month} />
            <GolfVisitsList />
          </>
        )}
      </div>
    </div>
  )
}

function UpcomingList({ events, todayStr, year, month }) {
  const upcoming = Object.entries(events)
    .filter(([date]) => date >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 10)

  if (upcoming.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">No upcoming events this month</p>
  }

  return (
    <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
      {upcoming.map(([date, evs]) => (
        <div key={date} className="px-4 py-3">
          <p className="text-slate-400 text-xs mb-2">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <div className="flex flex-col gap-1.5">
            {evs.map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                <span className="text-slate-300 text-sm flex-1 truncate">{ev.label}</span>
                {ev.amount != null && (
                  <span className={`text-xs font-semibold ${
                    ev.type === 'payday' || ev.txType === 'income' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {ev.type === 'payday' || ev.txType === 'income' ? '+' : '−'}{fmt(ev.amount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GolfVisitsList() {
  const golf = getGolf()
  const visits = [...golf.visits].sort((a, b) => b.date.localeCompare(a.date))
  if (visits.length === 0) return null

  return (
    <div className="mt-4">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Golf Visits (All)</p>
      <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
        {visits.map(v => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm truncate">{v.label}</p>
              <p className="text-slate-500 text-xs">
                {new Date(v.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span className="text-blue-400 text-sm font-semibold">{fmt(v.price)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
