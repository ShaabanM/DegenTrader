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

export interface FeeSnapshot {
  commission: number
  exchangeFee: number
  clearingFee: number
  fxCost: number
  totalFees: number
}

export interface TradeSimulation {
  investmentAmount: number
  buyPrice: number
  sellPrice: number
  shares: number
  actualCost: number
  unusedCash: number
  grossProfit: number
  buyFees: FeeSnapshot
  sellFees: FeeSnapshot
  totalFees: number
  netProfit: number
  returnPct: number
  breakEvenPrice: number
}

export interface LoggedTrade {
  id: string
  shares: number
  buyPrice: number
  totalCost: number
  buyFees: number
  timestamp: number
  note: string
}

export type SignalAction = 'BUY' | 'SELL' | 'FLAT'

export interface SignalMetric {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'neutral'
}

export interface AlgoSignal {
  id: string
  name: string
  description: string
  category: Algorithm['category']
  horizon: string
  action: SignalAction
  confidence: number
  reasoning: string
  reasons: string[]
  metrics: SignalMetric[]
  entryPrice?: number
  exitPrice?: number
  timestamp: number
}

export interface AlgoInput {
  vwraPrices: PricePoint[]
  oilPrices: PricePoint[]
  currentVwra: number
  currentOil: number
  liveVwra?: MarketData
  liveOil?: MarketData
}

export interface AlgoOutput {
  action: SignalAction
  confidence: number
  reasoning: string
  reasons?: string[]
  metrics?: SignalMetric[]
  entryPrice?: number
  exitPrice?: number
}

export interface Algorithm {
  id: string
  name: string
  description: string
  category: 'momentum' | 'mean-reversion' | 'technical' | 'cross-asset' | 'volatility'
  horizon: string
  minConfidence?: number
  maxHoldBars?: number
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
  shares?: number
  barsHeld?: number
  exitReason?: string
}

export interface EquityPoint {
  date: string
  equity: number
  benchmark?: number
}

export interface BacktestResult {
  algoId: string
  algoName: string
  description: string
  horizon: string
  trades: BacktestTrade[]
  totalReturn: number
  totalReturnPct: number
  benchmarkReturnPct: number
  alphaPct: number
  winRate: number
  maxDrawdown: number
  sharpeRatio: number
  exposurePct: number
  avgHoldBars: number
  startingCapital: number
  finalEquity: number
  equityCurve: EquityPoint[]
}

export interface AlignedPriceBar {
  date: string
  vwra: PricePoint
  oil: PricePoint
}

export interface AnalysisSnapshot {
  bars: AlignedPriceBar[]
  latest: AlignedPriceBar
  latestVwra: number
  latestOil: number
  sessionBars: AlignedPriceBar[]
  ema8: number
  ema21: number
  ema55: number
  rsi14: number
  zScore20: number
  correlation20: number
  lagCorrelation1: number
  lagCorrelation2: number
  oilReturn30m: number
  oilReturn1h: number
  oilReturn2h: number
  oilSessionReturn: number
  vwraReturn30m: number
  vwraReturn1h: number
  vwraReturn2h: number
  vwraSessionReturn: number
  sessionVwap: number
  distanceFromVwap: number
  openingRangeHigh: number
  openingRangeLow: number
  rangePosition: number
  sessionTrend: 'up' | 'down' | 'mixed'
  oilPressure: 'rising' | 'falling' | 'stable'
}

export interface ConsensusSignal {
  action: SignalAction
  confidence: number
  label: string
  summary: string
  support: string[]
  buyCount: number
  sellCount: number
  flatCount: number
  buyWeight: number
  sellWeight: number
}

export interface MarketPulse {
  correlation: number
  lagCorrelation1: number
  lagCorrelation2: number
  oil2h: number
  oilSession: number
  vwra2h: number
  vwraSession: number
  distanceFromVwap: number
  rangePosition: number
  sessionTrend: AnalysisSnapshot['sessionTrend']
  oilPressure: AnalysisSnapshot['oilPressure']
  openingRangeHigh: number
  openingRangeLow: number
  regimeLabel: string
  regimeSummary: string
  badges: SignalMetric[]
}
