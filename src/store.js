// ── Helpers ──────────────────────────────────────────────────────────────────

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uuid() {
  return crypto.randomUUID()
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_SETTINGS = {
  startingBalance: 4530.21,
  startingBalanceDate: '2026-04-13',
  payAmount: 1900,
  payFrequency: 'biweekly',       // 'biweekly' | 'weekly' | 'monthly'
  firstPayday: '2026-04-16',      // first payday after seed date
  seeded: true,
}

const SEED_TRANSACTIONS = [
  {
    id: uuid(),
    date: '2026-04-15',
    desc: 'Simprico Trio (USAA)',
    amt: 151.29,
    cat: 'Shopping',
    type: 'expense',
  },
]

const SEED_CARDS = [
  {
    id: uuid(),
    name: 'Chase',
    balance: 3188.00,
    limit: null,
    apr: 0,
    aprExpires: '2026-11-11',
    minPayment: null,
    color: '#3b82f6',
  },
  {
    id: uuid(),
    name: 'USAA',
    balance: 435.29,
    limit: null,
    apr: null,
    aprExpires: null,
    minPayment: null,
    color: '#8b5cf6',
  },
  {
    id: uuid(),
    name: 'AB Card',
    balance: 252.00,
    limit: null,
    apr: null,
    aprExpires: null,
    minPayment: null,
    dueDay: 3,   // due on the 3rd of each month
    color: '#f59e0b',
  },
]

const SEED_LOANS = [
  {
    id: uuid(),
    name: 'Car Loan',
    monthlyPayment: 479.25,
    balance: null,
  },
  {
    id: uuid(),
    name: 'Student Loans',
    monthlyPayment: 279.50,
    balance: null,
  },
]

const SEED_BILLS = [
  { id: uuid(), name: 'Rent',         amount: 900.00, dueDay: 2,  category: 'Bills & Utilities', autopay: false, active: true },
  { id: uuid(), name: 'Car Payment',  amount: 479.25, dueDay: 6,  category: 'Auto & Transport',  autopay: false, active: true },
  { id: uuid(), name: 'Verizon Fios', amount: 123.88, dueDay: 25, category: 'Bills & Utilities', autopay: true,  active: true },
  { id: uuid(), name: 'Gym',          amount: 52.50,  dueDay: 2,  category: 'Health & Wellness', autopay: false, active: true },
  { id: uuid(), name: 'Electric',     amount: 33.18,  dueDay: 2,  category: 'Bills & Utilities', autopay: false, active: true },
  { id: uuid(), name: 'Internet',     amount: 13.34,  dueDay: 2,  category: 'Bills & Utilities', autopay: false, active: true },
]

const SEED_BUDGET_CATEGORIES = [
  { id: uuid(), name: 'Auto & Transport',  budgeted: 70,  color: '#f59e0b' },
  { id: uuid(), name: 'Chase Loan',        budgeted: 250, color: '#3b82f6' },
  { id: uuid(), name: 'Dining & Drinks',   budgeted: 150, color: '#f97316' },
  { id: uuid(), name: 'Eating Out',        budgeted: 150, color: '#ef4444' },
  { id: uuid(), name: 'Groceries',         budgeted: 300, color: '#10b981' },
  { id: uuid(), name: 'Health & Wellness', budgeted: 45,  color: '#06b6d4' },
  { id: uuid(), name: 'Loan Payment',      budgeted: 280, color: '#8b5cf6' },
  { id: uuid(), name: 'Pets',              budgeted: 90,  color: '#84cc16' },
  { id: uuid(), name: 'Poker',             budgeted: 30,  color: '#6b7280' },
  { id: uuid(), name: 'Shopping',          budgeted: 50,  color: '#ec4899' },
  { id: uuid(), name: 'Software & Tech',   budgeted: 45,  color: '#14b8a6' },
  { id: uuid(), name: 'Sports Betting',    budgeted: 100, color: '#a855f7' },
  { id: uuid(), name: 'Everything Else',   budgeted: 70,  color: '#64748b' },
]

const SEED_GOLF = {
  membershipCost: 590.00,
  membershipPaidDate: '2026-04-13',
  membershipYear: 2026,
  visitTypes: [
    { id: 'holes18', label: '18 Holes', price: 45.00, active: true },
    { id: 'holes9',  label: '9 Holes',  price: 25.00, active: true },
    { id: 'range',   label: 'Range',    price: 0,     active: false, note: 'Closed' },
  ],
  visits: [],
}

// ── Keys ──────────────────────────────────────────────────────────────────────

const KEYS = {
  settings:    'pf_settings',
  transactions:'pf_transactions',
  cards:       'pf_cards',
  loans:       'pf_loans',
  bills:       'pf_bills',
  billsStatus: 'pf_bills_status',
  budget:      'pf_budget',
  golf:        'pf_golf',
  assets:      'pf_assets',
}

// ── Initialize (runs once on first load) ─────────────────────────────────────

export function initStore() {
  const settings = load(KEYS.settings, null)

  if (!settings?.seeded) {
    save(KEYS.settings,     SEED_SETTINGS)
    save(KEYS.transactions, SEED_TRANSACTIONS)
    save(KEYS.cards,        SEED_CARDS)
    save(KEYS.loans,        SEED_LOANS)
    save(KEYS.bills,        SEED_BILLS)
    save(KEYS.billsStatus,  {})
    save(KEYS.budget,       SEED_BUDGET_CATEGORIES)
    save(KEYS.golf,         SEED_GOLF)
    return
  }

  // Migration v2: seed bills + budget if still empty
  if (!settings.seedVersion || settings.seedVersion < 2) {
    if (load(KEYS.bills, []).length === 0)  save(KEYS.bills,  SEED_BILLS)
    if (load(KEYS.budget, []).length === 0) save(KEYS.budget, SEED_BUDGET_CATEGORIES)
    save(KEYS.settings, { ...settings, seedVersion: 2 })
  }

  // Migration v3: update golf membership cost to $590
  if (!settings.seedVersion || settings.seedVersion < 3) {
    const golf = load(KEYS.golf, null)
    if (golf) save(KEYS.golf, { ...golf, membershipCost: 590.00 })
    save(KEYS.settings, { ...load(KEYS.settings, settings), seedVersion: 3 })
  }

  // Migration v4: balance reset to Apr 23, mark April bills paid, update card balances
  if (!settings.seedVersion || settings.seedVersion < 4) {
    const s = load(KEYS.settings, {})
    save(KEYS.settings, { ...s, startingBalance: 2689.68, startingBalanceDate: '2026-04-23', seedVersion: 4 })

    // Remove transactions before Apr 23 — baked into new starting balance
    const txns = load(KEYS.transactions, [])
    save(KEYS.transactions, txns.filter(t => t.date >= '2026-04-23'))

    // Mark April bills paid by name
    const bills = load(KEYS.bills, [])
    const status = load(KEYS.billsStatus, {})
    const paidNames = ['Rent', 'Car Payment', 'Gym', 'Electric', 'Internet']
    bills.forEach(b => {
      if (paidNames.includes(b.name)) status[`${b.id}-2026-04`] = true
    })
    save(KEYS.billsStatus, status)

    // Update card balances — AB paid off, USAA pending clears by Friday
    const cards = load(KEYS.cards, [])
    save(KEYS.cards, cards.map(c => {
      if (c.name === 'USAA')    return { ...c, balance: 476.04 } // still pending
      if (c.name === 'AB Card') return { ...c, balance: 0 }
      return c
    }))
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings() {
  return load(KEYS.settings, SEED_SETTINGS)
}

export function saveSettings(settings) {
  save(KEYS.settings, settings)
}

// ── Payday logic ──────────────────────────────────────────────────────────────

export function getPaydays(fromDate, toDate) {
  const settings = getSettings()
  const paydays = []
  const first = new Date(settings.firstPayday + 'T00:00:00')
  const from  = new Date(fromDate + 'T00:00:00')
  const to    = new Date(toDate + 'T00:00:00')

  let current = new Date(first)

  // Step backward to find earliest payday at or after fromDate
  while (current > from) {
    current = new Date(current.getTime() - 14 * 86400000)
  }
  // Step forward to fromDate
  while (current < from) {
    current = new Date(current.getTime() + 14 * 86400000)
  }

  while (current <= to) {
    paydays.push(current.toISOString().slice(0, 10))
    current = new Date(current.getTime() + 14 * 86400000)
  }

  return paydays
}

export function getNextPayday() {
  const today = new Date().toISOString().slice(0, 10)
  const far   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const days  = getPaydays(today, far)
  return days[0] ?? null
}

export function getDaysUntilPayday() {
  const next = getNextPayday()
  if (!next) return null
  const ms = new Date(next + 'T00:00:00') - new Date(new Date().toDateString())
  return Math.round(ms / 86400000)
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function getTransactions() {
  return load(KEYS.transactions, [])
}

export function saveTransactions(txns) {
  save(KEYS.transactions, txns)
}

export function addTransaction(txn) {
  const txns = getTransactions()
  txns.push({ id: uuid(), ...txn })
  saveTransactions(txns)
}

export function deleteTransaction(id) {
  saveTransactions(getTransactions().filter(t => t.id !== id))
}

// Compute live balance: starting balance ± all transactions
export function getLiveBalance() {
  const { startingBalance } = getSettings()
  const txns = getTransactions()
  return txns.reduce((bal, t) => {
    return t.type === 'expense' ? bal - t.amt : bal + t.amt
  }, startingBalance)
}

// Transactions sorted newest-first with running balance
export function getTransactionsWithBalance() {
  const { startingBalance } = getSettings()
  const txns = [...getTransactions()].sort((a, b) => b.date.localeCompare(a.date))

  // Running balance from oldest to newest, then annotate in display order
  const chronological = [...getTransactions()].sort((a, b) => a.date.localeCompare(b.date))
  const balanceMap = {}
  let running = startingBalance
  for (const t of chronological) {
    running = t.type === 'expense' ? running - t.amt : running + t.amt
    balanceMap[t.id] = running
  }

  return txns.map(t => ({ ...t, runningBalance: balanceMap[t.id] }))
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export function getCards() {
  return load(KEYS.cards, [])
}

export function saveCards(cards) {
  save(KEYS.cards, cards)
}

export function updateCard(id, patch) {
  saveCards(getCards().map(c => c.id === id ? { ...c, ...patch } : c))
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export function getLoans() {
  return load(KEYS.loans, [])
}

export function saveLoans(loans) {
  save(KEYS.loans, loans)
}

// ── Bills ─────────────────────────────────────────────────────────────────────

export function getBills() {
  return load(KEYS.bills, [])
}

export function saveBills(bills) {
  save(KEYS.bills, bills)
}

export function getBillsStatus() {
  return load(KEYS.billsStatus, {})
}

// Key: "billId-YYYY-MM" — resets per billing month
export function toggleBillPaid(billId, month) {
  const status = getBillsStatus()
  const key = `${billId}-${month}`
  status[key] = !status[key]
  save(KEYS.billsStatus, status)
}

export function isBillPaid(billId, month) {
  return !!getBillsStatus()[`${billId}-${month}`]
}

// ── Budget ────────────────────────────────────────────────────────────────────

export function getBudgetCategories() {
  return load(KEYS.budget, [])
}

export function saveBudgetCategories(cats) {
  save(KEYS.budget, cats)
}

// Compute actuals for a given month (YYYY-MM) from transactions
export function getBudgetActuals(month) {
  const txns = getTransactions().filter(t => t.date.startsWith(month) && t.type === 'expense')
  const actuals = {}
  for (const t of txns) {
    actuals[t.cat] = (actuals[t.cat] ?? 0) + t.amt
  }
  return actuals
}

// ── Assets (for net worth) ────────────────────────────────────────────────────

export function getAssets() {
  return load(KEYS.assets, [])
}

export function saveAssets(assets) {
  save(KEYS.assets, assets)
}

// ── Golf ──────────────────────────────────────────────────────────────────────

export function getGolf() {
  return load(KEYS.golf, SEED_GOLF)
}

export function saveGolf(golf) {
  save(KEYS.golf, golf)
}

export function addGolfVisit(visit) {
  const golf = getGolf()
  golf.visits.push({ id: uuid(), ...visit })
  saveGolf(golf)
}

export function deleteGolfVisit(id) {
  const golf = getGolf()
  golf.visits = golf.visits.filter(v => v.id !== id)
  saveGolf(golf)
}

export function getGolfBreakEven() {
  const golf = getGolf()
  const totalSpent = golf.visits.reduce((sum, v) => sum + v.price, 0)
  const remaining = Math.max(0, golf.membershipCost - totalSpent)
  const pct = Math.min(100, (totalSpent / golf.membershipCost) * 100)
  return { totalSpent, remaining, pct }
}

// ── Transaction categories ────────────────────────────────────────────────────

export const CATEGORIES = [
  'Auto & Transport',
  'Bills & Utilities',
  'Chase Loan',
  'Dining & Drinks',
  'Eating Out',
  'Entertainment',
  'Everything Else',
  'Golf',
  'Groceries',
  'Health & Wellness',
  'Income',
  'Loan Payment',
  'Personal Care',
  'Pets',
  'Poker',
  'Shopping',
  'Software & Tech',
  'Sports Betting',
  'Travel',
]

export const KEYWORD_MAP = [
  { keywords: ['netflix', 'hulu', 'spotify', 'disney', 'hbo', 'apple tv', 'peacock', 'youtube'], cat: 'Software & Tech' },
  { keywords: ['walmart', 'target', 'kroger', 'publix', 'aldi', 'trader joe', 'whole foods', 'costco', "sam's"], cat: 'Groceries' },
  { keywords: ['mcdonald', 'chipotle', 'chick-fil', 'starbucks', 'doordash', 'uber eats', 'grubhub', 'domino', 'pizza', 'taco bell', "wendy's", 'subway', 'dunkin', 'panera', 'five guys'], cat: 'Dining & Drinks' },
  { keywords: ['shell', 'exxon', 'bp ', 'chevron', 'marathon', 'sunoco', 'quiktrip', 'qt ', 'speedway', 'uber', 'lyft', 'parking', 'gas station'], cat: 'Auto & Transport' },
  { keywords: ['electric', 'water bill', 'gas bill', 'internet', 'xfinity', 'att ', 'verizon', 't-mobile', 'spectrum', 'rent', 'fios'], cat: 'Bills & Utilities' },
  { keywords: ['cvs', 'walgreen', 'rite aid', 'pharmacy', 'doctor', 'dental', 'vision', 'gym', 'planet fitness', 'anytime fitness'], cat: 'Health & Wellness' },
  { keywords: ['amazon', 'ebay', 'etsy', 'best buy', 'apple store', 'simprico'], cat: 'Shopping' },
  { keywords: ['direct deposit', 'payroll', 'ach deposit', 'zelle in', 'venmo in'], cat: 'Income' },
  { keywords: ['golf', 'topgolf', 'pga', 'golfsmith'], cat: 'Golf' },
  { keywords: ['student loan', 'navient', 'mohela', 'sallie mae', 'aidvantage'], cat: 'Loan Payment' },
  { keywords: ['petco', 'petsmart', 'pet supplies', 'vet ', 'veterinary', 'animal hospital'], cat: 'Pets' },
  { keywords: ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet'], cat: 'Sports Betting' },
]

export function autoCategorize(description) {
  const lower = description.toLowerCase()
  for (const { keywords, cat } of KEYWORD_MAP) {
    if (keywords.some(k => lower.includes(k))) return cat
  }
  return 'Other'
}
