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
  // You'll fill in the full list in Phase 5 — placeholder structure:
  // { id, name, amount, dueDay, category, autopay, active }
]

const SEED_BUDGET_CATEGORIES = [
  // Filled in Phase 5 with your Rocket Money data
]

const SEED_GOLF = {
  membershipCost: 554.00,
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
}

// ── Initialize (runs once on first load) ─────────────────────────────────────

export function initStore() {
  if (load(KEYS.settings, null)?.seeded) return   // already initialized

  save(KEYS.settings,     SEED_SETTINGS)
  save(KEYS.transactions, SEED_TRANSACTIONS)
  save(KEYS.cards,        SEED_CARDS)
  save(KEYS.loans,        SEED_LOANS)
  save(KEYS.bills,        SEED_BILLS)
  save(KEYS.billsStatus,  {})
  save(KEYS.budget,       SEED_BUDGET_CATEGORIES)
  save(KEYS.golf,         SEED_GOLF)
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
  'Entertainment',
  'Food & Drink',
  'Groceries',
  'Golf',
  'Health & Fitness',
  'Home',
  'Income',
  'Personal Care',
  'Shopping',
  'Student Loans',
  'Travel',
  'Other',
]

// Keyword → category mapping for CSV auto-categorization
export const KEYWORD_MAP = [
  { keywords: ['netflix', 'hulu', 'spotify', 'disney', 'hbo', 'apple tv', 'peacock'], cat: 'Entertainment' },
  { keywords: ['walmart', 'target', 'kroger', 'publix', 'aldi', 'trader joe', 'whole foods', 'costco', 'sam\'s'], cat: 'Groceries' },
  { keywords: ['mcdonald', 'chipotle', 'chick-fil', 'starbucks', 'doordash', 'uber eats', 'grubhub', 'domino', 'pizza', 'taco bell', 'wendy', 'subway', 'dunkin'], cat: 'Food & Drink' },
  { keywords: ['shell', 'exxon', 'bp ', 'chevron', 'marathon', 'sunoco', 'quiktrip', 'qt ', 'speedway', 'uber', 'lyft', 'parking'], cat: 'Auto & Transport' },
  { keywords: ['electric', 'water', 'gas bill', 'internet', 'xfinity', 'att ', 'verizon', 't-mobile', 'spectrum'], cat: 'Bills & Utilities' },
  { keywords: ['cvs', 'walgreen', 'rite aid', 'pharmacy', 'doctor', 'dental', 'vision', 'gym', 'planet fitness'], cat: 'Health & Fitness' },
  { keywords: ['amazon', 'ebay', 'etsy', 'best buy', 'apple store', 'simprico'], cat: 'Shopping' },
  { keywords: ['venmo', 'paypal', 'zelle', 'cashapp', 'direct deposit', 'payroll', 'ach deposit'], cat: 'Income' },
  { keywords: ['golf', 'topgolf', 'pga', 'golfsmith'], cat: 'Golf' },
  { keywords: ['student loan', 'navient', 'mohela', 'sallie mae'], cat: 'Student Loans' },
]

export function autoCategorize(description) {
  const lower = description.toLowerCase()
  for (const { keywords, cat } of KEYWORD_MAP) {
    if (keywords.some(k => lower.includes(k))) return cat
  }
  return 'Other'
}
