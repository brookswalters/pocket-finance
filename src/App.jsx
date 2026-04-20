import { useState } from 'react'
import Dashboard from './tabs/Dashboard'
import Transactions from './tabs/Transactions'
import Forecast from './tabs/Forecast'
import Budget from './tabs/Budget'
import Cards from './tabs/Cards'
import Bills from './tabs/Bills'
import ChasePayoff from './tabs/ChasePayoff'
import Calendar from './tabs/Calendar'
import Golf from './tabs/Golf'

const TABS = [
  { id: 'dashboard',    label: 'Home',     icon: HomeIcon,    component: Dashboard },
  { id: 'transactions', label: 'Spend',    icon: SpendIcon,   component: Transactions },
  { id: 'forecast',     label: 'Forecast', icon: ForecastIcon,component: Forecast },
  { id: 'budget',       label: 'Budget',   icon: BudgetIcon,  component: Budget },
  { id: 'cards',        label: 'Cards',    icon: CardsIcon,   component: Cards },
  { id: 'bills',        label: 'Bills',    icon: BillsIcon,   component: Bills },
  { id: 'chase',        label: 'Chase',    icon: ChaseIcon,   component: ChasePayoff },
  { id: 'calendar',     label: 'Calendar', icon: CalendarIcon,component: Calendar },
  { id: 'golf',         label: 'Golf',     icon: GolfIcon,    component: Golf },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? Dashboard

  return (
    <div
      className="flex flex-col bg-slate-900 text-white"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <ActiveComponent onNavigate={setActiveTab} />
      </main>

      {/* Bottom tab bar */}
      <nav
        className="bg-slate-900 border-t border-slate-800 shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] transition-colors active:opacity-60"
                style={{ minWidth: 0 }}
              >
                <Icon active={active} />
                <span
                  className={`text-[9px] font-medium leading-none tracking-tight ${
                    active ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/* ── Inline SVG icons ── */

function HomeIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function SpendIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 2.5 2 2.5-2 3.5 2z" />
    </svg>
  )
}

function ForecastIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  )
}

function BudgetIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function CardsIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function BillsIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function ChaseIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function GolfIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="18" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6l6 3-6 3" />
    </svg>
  )
}
