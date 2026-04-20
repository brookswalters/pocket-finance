import { useState, useEffect, useRef } from 'react'
import { getCards, saveCards, getLoans, saveLoans, getBills, getLiveBalance, getAssets, saveAssets } from '../store'
import BottomSheet from '../components/BottomSheet'

function fmt(n) {
  return (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function daysUntil(dateStr) {
  const ms = new Date(dateStr + 'T00:00:00') - new Date(new Date().toDateString())
  return Math.round(ms / 86400000)
}

const BLANK_CARD = { name: '', balance: '', limit: '', apr: '', aprExpires: '', color: '#3b82f6' }
const BLANK_LOAN = { name: '', monthlyPayment: '', balance: '' }

const CARD_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316']

export default function Cards() {
  const [cards, setCards] = useState([])
  const [loans, setLoans] = useState([])
  const [bills, setBills] = useState([])
  const [assets, setAssets] = useState([])
  const [editCard, setEditCard] = useState(null)
  const [editLoan, setEditLoan] = useState(null)
  const [editAsset, setEditAsset] = useState(null)
  const [inlineEdit, setInlineEdit] = useState(null)
  const [inlineVal, setInlineVal] = useState('')
  const inlineRef = useRef()

  useEffect(() => {
    setCards(getCards())
    setLoans(getLoans())
    setBills(getBills())
    setAssets(getAssets())
  }, [])

  function refresh() {
    setCards(getCards())
    setLoans(getLoans())
    setAssets(getAssets())
  }

  function handleSaveAsset(form) {
    const all = getAssets()
    const cleaned = { ...form, balance: parseFloat(form.balance) || 0 }
    if (form.id) saveAssets(all.map(a => a.id === form.id ? cleaned : a))
    else saveAssets([...all, { ...cleaned, id: crypto.randomUUID() }])
    setEditAsset(null)
    refresh()
  }

  function handleDeleteAsset(id) {
    saveAssets(getAssets().filter(a => a.id !== id))
    setEditAsset(null)
    refresh()
  }

  // Inline balance edit
  function startInline(card) {
    setInlineEdit(card.id)
    setInlineVal(String(card.balance))
    setTimeout(() => inlineRef.current?.focus(), 50)
  }

  function commitInline(card) {
    const val = parseFloat(inlineVal)
    if (!isNaN(val)) {
      saveCards(getCards().map(c => c.id === card.id ? { ...c, balance: val } : c))
      refresh()
    }
    setInlineEdit(null)
  }

  function handleSaveCard(form) {
    const all = getCards()
    const cleaned = {
      ...form,
      balance: parseFloat(form.balance) || 0,
      limit: form.limit ? parseFloat(form.limit) : null,
      apr: form.apr !== '' ? parseFloat(form.apr) : null,
      aprExpires: form.aprExpires || null,
    }
    if (form.id) saveCards(all.map(c => c.id === form.id ? cleaned : c))
    else saveCards([...all, { ...cleaned, id: crypto.randomUUID() }])
    setEditCard(null)
    refresh()
  }

  function handleDeleteCard(id) {
    saveCards(getCards().filter(c => c.id !== id))
    setEditCard(null)
    refresh()
  }

  function handleSaveLoan(form) {
    const all = getLoans()
    const cleaned = { ...form, monthlyPayment: parseFloat(form.monthlyPayment) || 0, balance: form.balance ? parseFloat(form.balance) : null }
    if (form.id) saveLoans(all.map(l => l.id === form.id ? cleaned : l))
    else saveLoans([...all, { ...cleaned, id: crypto.randomUUID() }])
    setEditLoan(null)
    refresh()
  }

  function handleDeleteLoan(id) {
    saveLoans(getLoans().filter(l => l.id !== id))
    setEditLoan(null)
    refresh()
  }

  const totalCardDebt     = cards.reduce((s, c) => s + c.balance, 0)
  const totalLoanPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0)
  const totalBillsFixed   = bills.reduce((s, b) => s + b.amount, 0)
  const totalMonthly      = totalLoanPayments + totalBillsFixed

  // Net worth
  const cashBalance    = getLiveBalance()
  const totalAssets    = cashBalance + assets.reduce((s, a) => s + a.balance, 0)
  const totalLoanDebt  = loans.reduce((s, l) => s + (l.balance ?? 0), 0)
  const totalLiabilities = totalCardDebt + totalLoanDebt
  const netWorth       = totalAssets - totalLiabilities

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-900 px-4 pt-4 pb-3 shrink-0">
        <h1 className="text-white text-xl font-bold mb-3">Cards & Loans</h1>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-2 mb-1">
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs">Total Card Debt</p>
            <p className="text-red-400 font-bold text-lg mt-0.5">{fmt(totalCardDebt)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs">Fixed Monthly</p>
            <p className="text-white font-bold text-lg mt-0.5">{fmt(totalMonthly)}</p>
            <p className="text-slate-500 text-[10px]">bills + loans</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 flex flex-col gap-4">

        {/* Cards */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Credit Cards</p>
            <button onClick={() => setEditCard(BLANK_CARD)} className="text-emerald-400 text-xs">+ Add</button>
          </div>
          <div className="flex flex-col gap-2">
            {cards.map(card => {
              const chase = card.aprExpires
              const daysLeft = chase ? daysUntil(chase) : null
              const isEditing = inlineEdit === card.id

              return (
                <div key={card.id} className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                      <p className="text-white font-semibold">{card.name}</p>
                    </div>
                    <button onPointerDown={() => setEditCard(card)} className="text-slate-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                  {/* Balance — tap to edit inline */}
                  <div className="mb-1">
                    <p className="text-slate-500 text-xs mb-1">Balance</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-lg">$</span>
                        <input
                          ref={inlineRef}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={inlineVal}
                          onChange={e => setInlineVal(e.target.value)}
                          onBlur={() => commitInline(card)}
                          onKeyDown={e => e.key === 'Enter' && commitInline(card)}
                          className="bg-slate-700 text-white text-2xl font-bold rounded-lg px-2 py-1 w-full"
                        />
                      </div>
                    ) : (
                      <button onPointerDown={() => startInline(card)} className="text-left">
                        <p className="text-white text-2xl font-bold">{fmt(card.balance)}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">Tap to edit</p>
                      </button>
                    )}
                  </div>

                  {/* APR info */}
                  {card.apr !== null && (
                    <div className={`mt-3 rounded-xl px-3 py-2 ${daysLeft !== null && daysLeft <= 90 ? 'bg-red-500/20' : 'bg-slate-700/50'}`}>
                      <p className={`text-xs font-medium ${daysLeft !== null && daysLeft <= 90 ? 'text-red-400' : 'text-slate-400'}`}>
                        {card.apr === 0 ? '0% APR' : `${card.apr}% APR`}
                        {card.aprExpires ? ` — expires ${new Date(card.aprExpires + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        {daysLeft !== null ? ` (${daysLeft} days)` : ''}
                      </p>
                    </div>
                  )}

                  {card.dueDay && (
                    <p className="text-slate-500 text-xs mt-2">Due on the {card.dueDay}{['st','nd','rd'][card.dueDay-1] ?? 'th'} each month</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Loans */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Loans</p>
            <button onClick={() => setEditLoan(BLANK_LOAN)} className="text-emerald-400 text-xs">+ Add</button>
          </div>
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
            {loans.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No loans</p>
            ) : loans.map(loan => (
              <div key={loan.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-white font-medium text-sm">{loan.name}</p>
                  {loan.balance && <p className="text-slate-500 text-xs mt-0.5">Balance: {fmt(loan.balance)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{fmt(loan.monthlyPayment)}<span className="text-slate-500 font-normal text-xs">/mo</span></p>
                  </div>
                  <button onPointerDown={() => setEditLoan(loan)} className="text-slate-600 p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Monthly obligations breakdown */}
        <section>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Monthly Obligations</p>
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
            {loans.map(l => (
              <div key={l.id} className="flex justify-between px-4 py-2.5">
                <span className="text-slate-300 text-sm">{l.name}</span>
                <span className="text-white font-medium text-sm">{fmt(l.monthlyPayment)}</span>
              </div>
            ))}
            {bills.map(b => (
              <div key={b.id} className="flex justify-between px-4 py-2.5">
                <span className="text-slate-300 text-sm">{b.name}</span>
                <span className="text-white font-medium text-sm">{fmt(b.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-slate-700/30">
              <span className="text-white font-semibold text-sm">Total</span>
              <span className="text-white font-bold text-sm">{fmt(totalMonthly)}</span>
            </div>
          </div>
        </section>

        {/* Net Worth */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Net Worth</p>
            <button onClick={() => setEditAsset({ name: '', balance: '' })} className="text-emerald-400 text-xs">+ Add Asset</button>
          </div>
          <div className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700/50">
            {/* Assets */}
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Assets</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-slate-300 text-sm">Checking Balance</span>
              <span className="text-emerald-400 font-medium text-sm">{fmt(cashBalance)}</span>
            </div>
            {assets.map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-slate-300 text-sm flex-1">{a.name}</span>
                <span className="text-emerald-400 font-medium text-sm mr-2">{fmt(a.balance)}</span>
                <button onPointerDown={() => setEditAsset(a)} className="text-slate-600 p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex justify-between px-4 py-2.5 bg-slate-700/20">
              <span className="text-slate-400 text-sm">Total Assets</span>
              <span className="text-emerald-400 font-semibold text-sm">{fmt(totalAssets)}</span>
            </div>

            {/* Liabilities */}
            <div className="flex justify-between px-4 py-2.5 mt-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Liabilities</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-slate-300 text-sm">Card Debt</span>
              <span className="text-red-400 font-medium text-sm">−{fmt(totalCardDebt)}</span>
            </div>
            {loans.filter(l => l.balance).map(l => (
              <div key={l.id} className="flex justify-between px-4 py-2.5">
                <span className="text-slate-300 text-sm">{l.name}</span>
                <span className="text-red-400 font-medium text-sm">−{fmt(l.balance)}</span>
              </div>
            ))}
            {totalLiabilities === totalCardDebt && loans.some(l => !l.balance) && (
              <div className="px-4 py-2 bg-slate-700/10">
                <p className="text-slate-500 text-xs">Add loan balances in the Loans section to include them here</p>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 bg-slate-700/20">
              <span className="text-slate-400 text-sm">Total Liabilities</span>
              <span className="text-red-400 font-semibold text-sm">−{fmt(totalLiabilities)}</span>
            </div>

            {/* Net Worth total */}
            <div className="flex justify-between px-4 py-4 bg-slate-700/40">
              <span className="text-white font-bold text-base">Net Worth</span>
              <span className={`font-bold text-base ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netWorth < 0 ? '−' : ''}{fmt(Math.abs(netWorth))}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Sheets */}
      <CardSheet card={editCard} onClose={() => setEditCard(null)} onSave={handleSaveCard} onDelete={handleDeleteCard} />
      <LoanSheet loan={editLoan} onClose={() => setEditLoan(null)} onSave={handleSaveLoan} onDelete={handleDeleteLoan} />
      <AssetSheet asset={editAsset} onClose={() => setEditAsset(null)} onSave={handleSaveAsset} onDelete={handleDeleteAsset} />
    </div>
  )
}

function CardSheet({ card, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(card ?? BLANK_CARD)
  useEffect(() => { setForm(card ?? BLANK_CARD) }, [card])
  if (!card) return null
  const isNew = !card.id

  return (
    <BottomSheet open={!!card} onClose={onClose} title={isNew ? 'Add Card' : 'Edit Card'}>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-3">
        <input type="text" placeholder="Card name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <input type="number" placeholder="Balance" inputMode="decimal" step="0.01" value={form.balance}
          onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <input type="number" placeholder="APR % (leave blank if n/a)" inputMode="decimal" step="0.01" value={form.apr ?? ''}
          onChange={e => setForm(f => ({ ...f, apr: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <div>
          <label className="text-slate-400 text-xs mb-1 block">0% APR expiry (optional)</label>
          <input type="date" value={form.aprExpires ?? ''}
            onChange={e => setForm(f => ({ ...f, aprExpires: e.target.value }))}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm" />
        </div>
        {/* Color */}
        <div className="flex gap-2">
          {CARD_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
              className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <button type="submit" className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3">
          {isNew ? 'Add Card' : 'Save Changes'}
        </button>
        {!isNew && (
          <button type="button" onClick={() => onDelete(card.id)}
            className="w-full bg-red-500/20 text-red-400 font-semibold rounded-xl py-3">
            Delete Card
          </button>
        )}
      </form>
    </BottomSheet>
  )
}

function LoanSheet({ loan, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(loan ?? BLANK_LOAN)
  useEffect(() => { setForm(loan ?? BLANK_LOAN) }, [loan])
  if (!loan) return null
  const isNew = !loan.id

  return (
    <BottomSheet open={!!loan} onClose={onClose} title={isNew ? 'Add Loan' : 'Edit Loan'}>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-3">
        <input type="text" placeholder="Loan name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <input type="number" placeholder="Monthly payment" inputMode="decimal" step="0.01" value={form.monthlyPayment}
          onChange={e => setForm(f => ({ ...f, monthlyPayment: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <input type="number" placeholder="Current balance (optional)" inputMode="decimal" step="0.01" value={form.balance ?? ''}
          onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <button type="submit" className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3">
          {isNew ? 'Add Loan' : 'Save Changes'}
        </button>
        {!isNew && (
          <button type="button" onClick={() => onDelete(loan.id)}
            className="w-full bg-red-500/20 text-red-400 font-semibold rounded-xl py-3">
            Delete Loan
          </button>
        )}
      </form>
    </BottomSheet>
  )
}

function AssetSheet({ asset, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(asset ?? { name: '', balance: '' })
  useEffect(() => { setForm(asset ?? { name: '', balance: '' }) }, [asset])
  if (!asset) return null
  const isNew = !asset.id

  return (
    <BottomSheet open={!!asset} onClose={onClose} title={isNew ? 'Add Asset' : 'Edit Asset'}>
      <p className="text-slate-400 text-sm mb-3">Add savings, investments, or any other asset to include in your net worth.</p>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-3">
        <input type="text" placeholder="Account name (e.g. Savings, 401k)" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <input type="number" placeholder="Current balance" inputMode="decimal" step="0.01" value={form.balance}
          onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500" />
        <button type="submit" className="w-full bg-emerald-500 text-white font-semibold rounded-xl py-3">
          {isNew ? 'Add Asset' : 'Save Changes'}
        </button>
        {!isNew && (
          <button type="button" onClick={() => onDelete(asset.id)}
            className="w-full bg-red-500/20 text-red-400 font-semibold rounded-xl py-3">
            Delete Asset
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
