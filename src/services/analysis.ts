import type { AlgoSignal, BacktestResult, ConsensusSignal, MarketPulse, MarketData, PricePoint, SignalAction } from '../types/market'
import { buildAnalysisSnapshot, clamp, formatSignedPercent } from '../algos/utils'

function actionWeight(result: BacktestResult | undefined): number {
  if (!result) return 0.35
  return clamp(0.35 + Math.max(result.alphaPct, -5) / 12 + result.winRate / 220, 0.1, 1.15)
}

export function buildConsensusSignal(signals: AlgoSignal[], backtests: BacktestResult[]): ConsensusSignal {
  const byId = new Map(backtests.map(result => [result.algoId, result]))

  let buyWeight = 0
  let sellWeight = 0

  for (const signal of signals) {
    const weight = signal.confidence * actionWeight(byId.get(signal.id))
    if (signal.action === 'BUY') buyWeight += weight
    if (signal.action === 'SELL') sellWeight += weight
  }

  const buyCount = signals.filter(signal => signal.action === 'BUY').length
  const sellCount = signals.filter(signal => signal.action === 'SELL').length
  const flatCount = signals.length - buyCount - sellCount
  const totalWeight = buyWeight + sellWeight
  const weightGap = Math.abs(buyWeight - sellWeight)

  let action: SignalAction = 'FLAT'
  if (buyWeight > sellWeight * 1.1 && buyWeight > 0.55) action = 'BUY'
  else if (sellWeight > buyWeight * 1.1 && sellWeight > 0.55) action = 'SELL'

  const confidence = totalWeight > 0
    ? clamp(0.25 + weightGap / totalWeight * 0.75, 0, 0.98)
    : 0

  const winningSignals = signals
    .filter(signal => signal.action === action)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
    .map(signal => signal.name)

  const label =
    action === 'BUY'
      ? 'Buy VWRA'
      : action === 'SELL'
        ? 'Sell To Cash'
        : 'Wait'

  const summary =
    action === 'BUY'
      ? 'The stronger models see enough oil relief and VWRA stability to get long.'
      : action === 'SELL'
        ? 'The better-performing models prefer cash until oil pressure or VWRA structure improves.'
        : 'Signals are mixed, so the tool is telling you not to force a trade.'

  return {
    action,
    confidence,
    label,
    summary,
    support: winningSignals,
    buyCount,
    sellCount,
    flatCount,
    buyWeight,
    sellWeight,
  }
}

export function buildMarketPulse(
  vwra: MarketData | undefined,
  oil: MarketData | undefined,
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
): MarketPulse | null {
  if (!vwra || !oil) return null

  const snapshot = buildAnalysisSnapshot({
    vwraPrices: vwraHistory,
    oilPrices: oilHistory,
    currentVwra: vwra.price,
    currentOil: oil.price,
    liveVwra: vwra,
    liveOil: oil,
  })

  if (!snapshot) return null

  const regimeLabel =
    snapshot.oilPressure === 'rising' && snapshot.correlation20 < -0.3
      ? 'War-risk tape'
      : snapshot.oilPressure === 'falling' && snapshot.latestVwra > snapshot.sessionVwap
        ? 'Relief bounce'
        : snapshot.sessionTrend === 'up'
          ? 'Constructive'
          : snapshot.sessionTrend === 'down'
            ? 'Defensive'
            : 'Mixed'

  const regimeSummary =
    regimeLabel === 'War-risk tape'
      ? 'Brent is pushing higher while VWRA is still respecting the negative oil relationship.'
      : regimeLabel === 'Relief bounce'
        ? 'Oil has cooled off and VWRA is trading above session value.'
        : regimeLabel === 'Constructive'
          ? 'VWRA is above VWAP and trend support, but oil still matters.'
          : regimeLabel === 'Defensive'
            ? 'VWRA is under session value and needs oil to stop leaning against it.'
            : 'The tape is moving, but not in one clean direction.'

  return {
    correlation: snapshot.correlation20,
    lagCorrelation1: snapshot.lagCorrelation1,
    lagCorrelation2: snapshot.lagCorrelation2,
    oil2h: snapshot.oilReturn2h,
    oilSession: snapshot.oilSessionReturn,
    vwra2h: snapshot.vwraReturn2h,
    vwraSession: snapshot.vwraSessionReturn,
    distanceFromVwap: snapshot.distanceFromVwap,
    rangePosition: snapshot.rangePosition,
    sessionTrend: snapshot.sessionTrend,
    oilPressure: snapshot.oilPressure,
    openingRangeHigh: snapshot.openingRangeHigh,
    openingRangeLow: snapshot.openingRangeLow,
    regimeLabel,
    regimeSummary,
    badges: [
      {
        label: 'Oil 2h',
        value: formatSignedPercent(snapshot.oilReturn2h),
        tone: snapshot.oilReturn2h <= 0 ? 'positive' : 'negative',
      },
      {
        label: 'VWRA vs VWAP',
        value: formatSignedPercent(snapshot.distanceFromVwap),
        tone: snapshot.distanceFromVwap >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Corr 20',
        value: formatSignedPercent(snapshot.correlation20),
        tone: 'neutral',
      },
      {
        label: 'Range',
        value: `${(snapshot.rangePosition * 100).toFixed(0)}%`,
        tone: snapshot.rangePosition > 0.6 ? 'positive' : snapshot.rangePosition < 0.4 ? 'negative' : 'neutral',
      },
    ],
  }
}
