import { useState, useEffect } from 'react'
import { getBills, saveBills, toggleBillPaid, isBillPaid } from '../store'
import BottomSheet from '../components/BottomSheet'

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function dueDateThisMonth(dueDay) {
  const [y, m] = currentMonth().split('-').map(Number)
  return new Date(y, m - 1, dueDay)
}

function isOverdue(bill, month) {
  if (isBillPaid(bill.id, month)) return false
  const due = dueDateThisMonth(bill.dueDay)
  return new Date() > due
}

function dueDateLabel(dueDay) {
  const d = dueDateThisMonth(dueDay)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const BLANK_BILL = { name: '', amount: '', dueDay: 1, category: 'Bills & Utilities', autopay: false }

export default function Bills() {
  const [bills, setBills] = useState([])
  const [month, setMonth] = useState(currentMonth())
  const [editBill, setEditBill] = useState(null)   // null | bill object (new has no id)
  const [tick, setTick] = useState(0)

  useEffect(() => { setBills(getBills()) }, [tick])

  function refresh() { setTick(t => t + 1) }

  function handleToggle(bill) {
    toggleBillPaid(bill.id, month)
    refresh()
  }

  function handleSave(form) {
    const all = getBills()
    if (form.id) {
      saveBills(all.map(b => b.id === form.id ? form : b))
    } else {
      saveBills([...all, { ...form, id: crypto.randomUUID(), active: true }])
    }
    setEditBill(null)
    refresh()
  }

  function handleDelete(id) {
    saveBills(getBills().filter(b => b.id !== id))
    setEditBill(null)
    refresh()
  }

  const paid   = bills.filter(b => isBillPaid(b.id, month))
  const unpaid = bills.filter(b => !isBillPaid(b.id, month))
  const totalAmt  = bills.reduce((s, b) => s + b.amount, 0)
  const paidAmt   = paid.reduce((s, b)  => s + b.amount, 0)
  const unpaidAmt = unpaid.reduce((s, b) => s + b.amount, 0)
  const overdueCt = bills.filter(b => isOverdue(b, month)).length

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(d.toISOString().slice(0, 7))
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(d.toISOString().slice(0, 7))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Bills</h1>
          <button
            onClick={() => setEditBill(BLANK_BILL)}
            className="bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            + Add
          </button>
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
            <p className="text-slate-500 text-xs">Total</p>
            <p className="text-white font-semibold text-sm mt-0.5">{fmt(totalAmt)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Paid</p>
            <p className="text-emerald-400 font-semibold text-sm mt-0.5">{fmt(paidAmt)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs">Left</p>
            <p className={`font-semibold text-sm mt-0.5 ${overdueCt > 0 ? 'text-red-400' : 'text-amber-400'}`}>{fmt(unpaidAmt)}</p>
          </div>
        </div>
      </div>

      {/* Bill list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-slate-500 text-sm">No bills yet</p>
            <button onClick={() => setEditBill(BLANK_BILL)} className="text-emerald-400 text-sm">+ Add one</button>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
            {[...bills].sort((a, b) => a.dueDay - b.dueDay).map(bill => {
              const paid = isBillPaid(bill.id, month)
              const overdue = isOverdue(bill, month)
              return (
                <div
                  key={bill.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                  onClick={() => handleToggle(bill)}
                >
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    paid ? 'bg-emerald-500 border-emerald-500' : overdue ? 'border-red-500' : 'border-slate-600'
                  }`}>
                    {paid && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm ${paid ? 'text-slate-400 line-through' : overdue ? 'text-red-300' : 'text-white'}`}>
                        {bill.name}
                      </p>
                      {bill.autopay && (
                        <span className="bg-blue-500/20 text-blue-400 text-[10px] font-medium px-1.5 py-0.5 rounded">Auto</span>
                      )}
                      {overdue && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] font-medium px-1.5 py-0.5 rounded">Overdue</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">Due {dueDateLabel(bill.dueDay)} · {bill.category}</p>
                  </div>

                  {/* Amount + edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={`font-semibold text-sm ${paid ? 'text-slate-500' : overdue ? 'text-red-400' : 'text-white'}`}>
                      {fmt(bill.amount)}
                    </p>
                    <button
                      onPointerDown={e => { e.stopPropagation(); setEditBill(bill) }}
                      className="text-slate-600 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit / Add sheet */}
      <BillSheet
        bill={editBill}
        onClose={() => setEditBill(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}

function BillSheet({ bill, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(bill ?? BLANK_BILL)

  useEffect(() => { setForm(bill ?? BLANK_BILL) }, [bill])

  if (!bill) return null

  const isNew = !bill.id

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.amount) return
    onSave({ ...form, amount: parseFloat(form.amount), dueDay: parseInt(form.dueDay) })
  }

  return (
    <BottomSheet open={!!bill} onClose={onClose} title={isNew ? 'Add Bill' : 'Edit Bill'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="text" placeholder="Bill name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

        <input type="number" placeholder="Amount" inputMode="decimal" step="0.01" min="0" value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-slate-400 text-xs mb-1 block">Due day of month</label>
            <input type="number" min="1" max="31" value={form.dueDay}
              onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-slate-400 text-xs mb-1 block">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm">
              {['Bills & Utilities','Auto & Transport','Health & Wellness','Dining & Drinks','Groceries','Entertainment','Everything Else'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-4 py-3 cursor-pointer">
          <input type="checkbox" checked={form.autopay}
            onChange={e => setForm(f => ({ ...f, autopay: e.target.checked }))}
            className="w-4 h-4 rounded" />
          <span className="text-white text-sm">Autopay</span>
        </label>

        <button type="submit" className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3">
          {isNew ? 'Add Bill' : 'Save Changes'}
        </button>

        {!isNew && (
          <button type="button" onClick={() => onDelete(bill.id)}
            className="w-full bg-red-500/20 text-red-400 font-semibold rounded-xl py-3">
            Delete Bill
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
