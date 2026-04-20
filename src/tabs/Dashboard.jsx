import { useState, useEffect } from 'react'
import {
  getLiveBalance, getTransactionsWithBalance,
  getCards, getLoans, getBills, isBillPaid,
  getDaysUntilPayday, getNextPayday, getSettings,
} from '../store'
import DonutChart from '../components/DonutChart'

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function daysUntil(dateStr) {
  const ms = new Date(dateStr + 'T00:00:00') - new Date(new Date().toDateString())
  return Math.round(ms / 86400000)
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    const balance = getLiveBalance()
    const txns = getTransactionsWithBalance().slice(0, 5)
    const cards = getCards()
    const loans = getLoans()
    const bills = getBills()
    const settings = getSettings()
    const daysUntilPay = getDaysUntilPayday()
    const nextPayday = getNextPayday()

    // Bills ring
    const today = new Date()
    const month = today.toISOString().slice(0, 7)
    const paidBills = bills.filter(b => isBillPaid(b.id, month))
    const unpaidBills = bills.filter(b => !isBillPaid(b.id, month))
    const totalBilled = bills.reduce((s, b) => s + b.amount, 0)
    const totalPaid = paidBills.reduce((s, b) => s + b.amount, 0)

    // Chase warning
    const chase = cards.find(c => c.name === 'Chase')
    const chaseWarning = chase?.aprExpires ? daysUntil(chase.aprExpires) : null

    setData({ balance, txns, cards, loans, bills, daysUntilPay, nextPayday, paidBills, unpaidBills, totalBilled, totalPaid, chase, chaseWarning, settings })
  }

  if (!data) return <div className="flex items-center justify-center h-full"><div className="text-slate-500">Loading…</div></div>

  const { balance, txns, cards, loans, daysUntilPay, nextPayday, totalBilled, totalPaid, chase, chaseWarning, settings, bills } = data

  const totalCardDebt = cards.reduce((s, c) => s + c.balance, 0)
  const billsUnpaid = totalBilled - totalPaid

  const billSegments = totalBilled > 0
    ? [
        { value: totalPaid,   color: '#10b981', label: 'Paid' },
        { value: billsUnpaid, color: '#1e293b', label: 'Remaining' },
      ]
    : [{ value: 1, color: '#1e293b' }]

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">

      {/* Chase APR Warning */}
      {chase && chaseWarning !== null && chaseWarning <= 90 && (
        <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${chaseWarning <= 30 ? 'bg-red-500/20 border border-red-500/40' : 'bg-amber-500/20 border border-amber-500/40'}`}>
          <span className="text-xl shrink-0">{chaseWarning <= 30 ? '🚨' : '⚠️'}</span>
          <div>
            <p className={`font-semibold text-sm ${chaseWarning <= 30 ? 'text-red-400' : 'text-amber-400'}`}>
              Chase 0% APR expires in {chaseWarning} days
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              {fmt(chase.balance)} remaining — {chaseWarning <= 30 ? 'Pay it off now!' : 'Stay on track'}
            </p>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-slate-800 rounded-2xl p-5">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Current Balance</p>
        <p className={`text-4xl font-bold mt-1 ${balance < 0 ? 'text-red-400' : 'text-white'}`}>
          {fmt(balance)}
        </p>
        <p className="text-slate-500 text-xs mt-1">as of today</p>

        {/* Payday countdown */}
        <div className="mt-4 flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
          <div>
            <p className="text-slate-400 text-xs">Next Payday</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {nextPayday ? new Date(nextPayday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-bold text-lg">{fmt(settings.payAmount)}</p>
            <p className="text-slate-400 text-xs">
              {daysUntilPay === 0 ? 'Today! 🎉' : daysUntilPay === 1 ? 'Tomorrow' : `in ${daysUntilPay} days`}
            </p>
          </div>
        </div>
      </div>

      {/* Card Debt Row */}
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Card Debt</p>
        <div className="grid grid-cols-3 gap-2">
          {cards.map(card => (
            <div key={card.id} className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
              <p className="text-white font-semibold text-sm leading-tight">{fmt(card.balance)}</p>
              <p className="text-slate-500 text-xs truncate">{card.name}</p>
            </div>
          ))}
        </div>
        <div className="bg-slate-800/50 rounded-xl px-3 py-2 mt-2 flex justify-between items-center">
          <span className="text-slate-400 text-xs">Total card debt</span>
          <span className="text-red-400 font-semibold text-sm">{fmt(totalCardDebt)}</span>
        </div>
      </div>

      {/* Bills Ring */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Bills This Month</p>
        {bills.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-2">No bills set up yet — coming in Phase 5</p>
        ) : (
          <div className="flex items-center gap-4">
            <DonutChart segments={billSegments} size={90} thickness={14}>
              <p className="text-white font-bold text-sm">{fmt(totalPaid)}</p>
              <p className="text-slate-400 text-[10px]">paid</p>
            </DonutChart>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-emerald-400">Paid</span>
                <span className="text-white font-medium">{fmt(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Remaining</span>
                <span className="text-slate-300">{fmt(billsUnpaid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-700 pt-1 mt-1">
                <span className="text-slate-400">Total</span>
                <span className="text-slate-300">{fmt(totalBilled)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Last 5 Transactions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Recent</p>
          {onNavigate && (
            <button onClick={() => onNavigate('transactions')} className="text-emerald-400 text-xs">See all</button>
          )}
        </div>
        {txns.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-4 text-center text-slate-500 text-sm">No transactions yet</div>
        ) : (
          <div className="bg-slate-800 rounded-xl divide-y divide-slate-700/50">
            {txns.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.desc}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {t.cat}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-sm ${t.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {t.type === 'expense' ? '−' : '+'}{fmt(t.amt)}
                  </p>
                  <p className="text-slate-500 text-xs">{fmt(t.runningBalance)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
