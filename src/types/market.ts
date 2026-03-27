export interface MarketData {
  symbol: string
  name: string
  exchange: string
  currency: string
  price: number
  previousClose: number
  open: number
  dayHigh: number
  dayLow: number
  volume: number
  avgVolume: number
  week52High: number
  week52Low: number
  marketCap: number
  nav: number
  expenseRatio: number
  timestamp: number
}

export interface PricePoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TradeSimulation {
  investmentAmount: number
  buyPrice: number
  sellPrice: number
  shares: number
  grossProfit: number
  buyCommission: number
  sellCommission: number
  fxSpread: number
  stampDuty: number
  totalFees: number
  netProfit: number
  returnPct: number
  breakEvenPrice: number
}

// Trade log types
export interface LoggedTrade {
  id: string
  shares: number
  buyPrice: number
  totalCost: number // shares * buyPrice + buy fees
  buyFees: number
  timestamp: number
  note: string
}

// ===== Algo Trading Types =====

export type SignalAction = 'BUY' | 'SELL' | 'FLAT'

export interface AlgoSignal {
  id: string
  name: string
  action: SignalAction
  confidence: number  // 0-1
  reasoning: string
  entryPrice?: number
  exitPrice?: number
  timestamp: number
}

export interface AlgoInput {
  vwraPrices: PricePoint[]
  oilPrices: PricePoint[]
  currentVwra: number
  currentOil: number
}

export interface AlgoOutput {
  action: SignalAction
  confidence: number
  reasoning: string
  entryPrice?: number
  exitPrice?: number
}

export interface Algorithm {
  id: string
  name: string
  description: string
  category: 'momentum' | 'mean-reversion' | 'technical' | 'cross-asset' | 'volatility'
  compute(input: AlgoInput): AlgoOutput
  backtest(input: AlgoInput): BacktestTrade[]
}

export interface BacktestTrade {
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  action: 'BUY' | 'SELL'
  pnl: number
  pnlPct: number
}

export interface BacktestResult {
  algoId: string
  algoName: string
  trades: BacktestTrade[]
  totalReturn: number
  totalReturnPct: number
  winRate: number
  maxDrawdown: number
  sharpeRatio: number
  equityCurve: { date: string; equity: number }[]
}

export interface SentimentSignal {
  source: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  summary: string
  timestamp: number
}
