import { useState, useEffect } from 'react'
import { getCards, saveCards } from '../store'

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const DEADLINE = '2026-11-11'
const SCENARIOS = [300, 400, 500, 600]

function generateSchedule(balance, payment) {
  const deadline = new Date(DEADLINE + 'T00:00:00')
  const schedule = []
  let remaining = Math.round(balance * 100) / 100

  // Start from next calendar month
  const now = new Date()
  let month = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  while (remaining > 0 && schedule.length < 48) {
    const pay = Math.min(payment, remaining)
    remaining = Math.round((remaining - pay) * 100) / 100
    const isPast = month > deadline
    schedule.push({
      monthStr: month.toISOString().slice(0, 7),
      label: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      payment: pay,
      remaining: Math.max(0, remaining),
      isPast,
    })
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  }
  return schedule
}

export default function ChasePayoff() {
  const [balance, setBalance] = useState(3188)
  const [payment, setPayment] = useState(500)
  const [customInput, setCustomInput] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  useEffect(() => {
    const chase = getCards().find(c => c.name === 'Chase')
    if (chase) setBalance(chase.balance)
  }, [])

  const activePayment = useCustom ? (parseFloat(customInput) || 0) : payment
  const schedule = activePayment > 0 ? generateSchedule(balance, activePayment) : []

  const deadline = new Date(DEADLINE + 'T00:00:00')
  const daysLeft = Math.round((deadline - new Date()) / 86400000)
  const monthsLeft = Math.ceil(daysLeft / 30)

  const paidOffEntry = schedule.find(s => s.remaining === 0)
  const firstPastEntry = schedule.find(s => s.isPast)
  const remainingAtDeadline = firstPastEntry
    ? (schedule[schedule.indexOf(firstPastEntry) - 1]?.remaining ?? balance)
    : 0

  const isSafe = !firstPastEntry || (paidOffEntry && !paidOffEntry.isPast)
  const minToPayOff = monthsLeft > 0 ? Math.ceil(balance / monthsLeft) : balance

  const maxBar = balance

  function commitBalance() {
    const val = parseFloat(balanceInput)
    if (!isNaN(val) && val >= 0) {
      setBalance(val)
      saveCards(getCards().map(c => c.name === 'Chase' ? { ...c, balance: val } : c))
    }
    setEditingBalance(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-4 shrink-0">
        <h1 className="text-white text-xl font-bold mb-1">Chase Payoff</h1>
        <p className="text-slate-400 text-xs">0% APR — expires Nov 11, 2026 · {daysLeft} days left</p>

        {/* Balance */}
        <div className="mt-4 bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-500 text-xs mb-1">Current Balance</p>
          {editingBalance ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-2xl">$</span>
              <input
                type="number" inputMode="decimal" step="0.01" autoFocus
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                onBlur={commitBalance}
                onKeyDown={e => e.key === 'Enter' && commitBalance()}
                className="bg-slate-700 text-white text-3xl font-bold rounded-lg px-2 py-1 w-full"
              />
            </div>
          ) : (
            <button onPointerDown={() => { setBalanceInput(String(balance)); setEditingBalance(true) }} className="text-left">
              <p className="text-white text-3xl font-bold">{fmt(balance)}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Tap to update</p>
            </button>
          )}

          {/* Progress bar: paid off vs original */}
          <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.max(0, ((3188 - balance) / 3188) * 100)}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">{fmt(3188 - balance)} paid of $3,188 original</p>
        </div>

        {/* Smart message */}
        {activePayment > 0 && (
          <div className={`mt-3 rounded-xl px-4 py-3 ${isSafe ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <p className={`font-semibold text-sm ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
              {isSafe
                ? `✅ Safe — paid off ${paidOffEntry ? `by ${paidOffEntry.label}` : 'before deadline'}`
                : `🚨 At risk — ${fmt(remainingAtDeadline)} still owed on Nov 11`}
            </p>
            {!isSafe && (
              <p className="text-slate-400 text-xs mt-1">
                Pay at least {fmt(minToPayOff)}/mo to clear by the deadline
              </p>
            )}
          </div>
        )}
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">

        {/* Payment selector */}
        <div className="mt-4 mb-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Monthly Payment</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {SCENARIOS.map(s => (
              <button key={s} onPointerDown={() => { setPayment(s); setUseCustom(false) }}
                className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                  !useCustom && payment === s ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                {fmt(s)}
              </button>
            ))}
          </div>
          {/* Custom amount */}
          <div className="flex gap-2">
            <input
              type="number" inputMode="decimal" placeholder="Custom amount"
              value={customInput}
              onChange={e => { setCustomInput(e.target.value); setUseCustom(true) }}
              onFocus={() => setUseCustom(true)}
              className={`flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500 border-2 transition-colors ${
                useCustom ? 'border-blue-500' : 'border-transparent'
              }`}
            />
          </div>
        </div>

        {/* Month-by-month schedule */}
        {schedule.length > 0 && (
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Payoff Schedule</p>
            <div className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700/50">
              {schedule.map((row, i) => {
                const barW = Math.max(4, (row.remaining / maxBar) * 100)
                const isDeadlineMonth = row.monthStr === '2026-11'
                return (
                  <div key={row.monthStr} className={`px-4 py-3 ${row.isPast ? 'bg-red-500/5' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${row.isPast ? 'text-red-400' : 'text-white'}`}>
                          {row.label}
                        </span>
                        {isDeadlineMonth && (
                          <span className="bg-red-500/30 text-red-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            Deadline
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold ${row.isPast ? 'text-red-400' : 'text-emerald-400'}`}>
                          −{fmt(row.payment)}
                        </span>
                        <span className="text-slate-500 text-xs ml-2">{fmt(row.remaining)} left</span>
                      </div>
                    </div>
                    {/* Remaining balance bar */}
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barW}%`,
                          backgroundColor: row.isPast ? '#ef4444' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              {/* Paid off row */}
              {paidOffEntry && (
                <div className="px-4 py-3 bg-emerald-500/10 flex items-center gap-2">
                  <span className="text-emerald-400 text-sm font-semibold">🎉 Paid off — {paidOffEntry.label}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activePayment === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">Select or enter a monthly payment above</p>
        )}
      </div>
    </div>
  )
}
