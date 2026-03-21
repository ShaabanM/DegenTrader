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

// Future phase types
export interface SentimentSignal {
  source: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  summary: string
  timestamp: number
}

export interface AlgoSignal {
  strategy: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  reason: string
  timestamp: number
}
