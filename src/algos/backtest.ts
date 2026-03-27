import type { AlgoInput, AlgoOutput, BacktestTrade } from '../types/market'
import { alignPriceSeries } from './utils'

interface BacktestOptions {
  warmupBars?: number
  minConfidence?: number
  maxHoldBars?: number
}

export function runLongFlatSignalBacktest(
  input: AlgoInput,
  compute: (value: AlgoInput) => AlgoOutput,
  options: BacktestOptions = {},
): BacktestTrade[] {
  const bars = alignPriceSeries(input.vwraPrices, input.oilPrices)
  const warmupBars = options.warmupBars ?? 30
  const minConfidence = options.minConfidence ?? 0.5
  const maxHoldBars = options.maxHoldBars ?? 16

  if (bars.length <= warmupBars + 1) return []

  const trades: BacktestTrade[] = []
  let entryIndex: number | null = null

  for (let index = warmupBars; index < bars.length - 1; index++) {
    const window = bars.slice(0, index + 1)
    const signal = compute({
      vwraPrices: window.map(bar => bar.vwra),
      oilPrices: window.map(bar => bar.oil),
      currentVwra: window[window.length - 1].vwra.close,
      currentOil: window[window.length - 1].oil.close,
    })

    if (entryIndex === null) {
      if (signal.action === 'BUY' && signal.confidence >= minConfidence) {
        entryIndex = index + 1
      }
      continue
    }

    const barsHeld = index + 1 - entryIndex
    const shouldExit =
      (signal.action === 'SELL' && signal.confidence >= minConfidence * 0.85) ||
      barsHeld >= maxHoldBars

    if (!shouldExit) continue

    const entryBar = bars[entryIndex]
    const exitBar = bars[index + 1]
    trades.push({
      entryDate: entryBar.date,
      exitDate: exitBar.date,
      entryPrice: entryBar.vwra.open,
      exitPrice: exitBar.vwra.open,
      action: 'BUY',
      pnl: exitBar.vwra.open - entryBar.vwra.open,
      pnlPct: (exitBar.vwra.open - entryBar.vwra.open) / entryBar.vwra.open * 100,
      barsHeld,
      exitReason: barsHeld >= maxHoldBars ? 'time stop' : 'sell signal',
    })
    entryIndex = null
  }

  if (entryIndex !== null) {
    const entryBar = bars[entryIndex]
    const exitBar = bars[bars.length - 1]
    trades.push({
      entryDate: entryBar.date,
      exitDate: exitBar.date,
      entryPrice: entryBar.vwra.open,
      exitPrice: exitBar.vwra.close,
      action: 'BUY',
      pnl: exitBar.vwra.close - entryBar.vwra.open,
      pnlPct: (exitBar.vwra.close - entryBar.vwra.open) / entryBar.vwra.open * 100,
      barsHeld: bars.length - 1 - entryIndex,
      exitReason: 'latest bar',
    })
  }

  return trades
}
