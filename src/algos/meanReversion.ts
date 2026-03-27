import type { Algorithm, AlgoInput, AlgoOutput, BacktestTrade } from '../types/market'
import { sma, stdDev } from './utils'

/**
 * Mean Reversion: Bollinger Band-style signals.
 * Buy when price is >1.5 std devs below 20-day SMA, sell when above.
 */
export const meanReversion: Algorithm = {
  id: 'mean-reversion',
  name: 'Mean Reversion',
  description: 'Buys when VWRA is oversold vs 20-day average, sells when overbought',
  category: 'mean-reversion',

  compute(input: AlgoInput): AlgoOutput {
    const { vwraPrices, currentVwra } = input
    const closes = vwraPrices.map(p => p.close)
    if (closes.length < 20) {
      return { action: 'FLAT', confidence: 0, reasoning: 'Need 20+ days of data' }
    }

    const period = 20
    const means = sma(closes, period)
    const stds = stdDev(closes, period)
    const lastMean = means[means.length - 1]
    const lastStd = stds[stds.length - 1]

    if (isNaN(lastMean) || isNaN(lastStd) || lastStd === 0) {
      return { action: 'FLAT', confidence: 0, reasoning: 'Insufficient data for Bollinger calculation' }
    }

    const zScore = (currentVwra - lastMean) / lastStd
    const THRESHOLD = 1.5

    if (zScore < -THRESHOLD) {
      return {
        action: 'BUY',
        confidence: Math.min(1, Math.abs(zScore) / 3),
        reasoning: `Price ${Math.abs(zScore).toFixed(1)}σ below 20d mean ($${lastMean.toFixed(2)}), expecting reversion up`,
        entryPrice: currentVwra,
        exitPrice: lastMean,
      }
    }

    if (zScore > THRESHOLD) {
      return {
        action: 'SELL',
        confidence: Math.min(1, Math.abs(zScore) / 3),
        reasoning: `Price ${zScore.toFixed(1)}σ above 20d mean ($${lastMean.toFixed(2)}), expecting reversion down`,
        entryPrice: currentVwra,
        exitPrice: lastMean,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.3,
      reasoning: `Price within normal range (z=${zScore.toFixed(1)}), 20d mean: $${lastMean.toFixed(2)}`,
    }
  },

  backtest(input: AlgoInput): BacktestTrade[] {
    const { vwraPrices } = input
    const trades: BacktestTrade[] = []
    const closes = vwraPrices.map(p => p.close)
    if (closes.length < 25) return trades

    const period = 20
    const THRESHOLD = 1.5
    const means = sma(closes, period)
    const stds = stdDev(closes, period)

    let position: 'BUY' | 'SELL' | null = null
    let entryIdx = 0

    for (let i = period; i < closes.length; i++) {
      const mean = means[i]
      const std = stds[i]
      if (isNaN(mean) || isNaN(std) || std === 0) continue

      const z = (closes[i] - mean) / std

      let signal: 'BUY' | 'SELL' | 'FLAT' = 'FLAT'
      if (z < -THRESHOLD) signal = 'BUY'
      else if (z > THRESHOLD) signal = 'SELL'
      // Exit when z-score returns to [-0.5, 0.5]
      else if (position !== null && Math.abs(z) < 0.5) signal = 'FLAT'
      else if (position !== null) continue // hold

      if (position === null && signal !== 'FLAT') {
        position = signal
        entryIdx = i
      } else if (position !== null && (signal === 'FLAT' || signal !== position)) {
        trades.push({
          entryDate: vwraPrices[entryIdx].date,
          exitDate: vwraPrices[i].date,
          entryPrice: closes[entryIdx],
          exitPrice: closes[i],
          action: position,
          pnl: position === 'BUY' ? closes[i] - closes[entryIdx] : closes[entryIdx] - closes[i],
          pnlPct: position === 'BUY'
            ? (closes[i] - closes[entryIdx]) / closes[entryIdx] * 100
            : (closes[entryIdx] - closes[i]) / closes[entryIdx] * 100,
        })
        position = signal === 'FLAT' ? null : signal
        entryIdx = i
      }
    }

    if (position !== null) {
      const lastIdx = closes.length - 1
      trades.push({
        entryDate: vwraPrices[entryIdx].date,
        exitDate: vwraPrices[lastIdx].date,
        entryPrice: closes[entryIdx],
        exitPrice: closes[lastIdx],
        action: position,
        pnl: position === 'BUY' ? closes[lastIdx] - closes[entryIdx] : closes[entryIdx] - closes[lastIdx],
        pnlPct: position === 'BUY'
          ? (closes[lastIdx] - closes[entryIdx]) / closes[entryIdx] * 100
          : (closes[entryIdx] - closes[lastIdx]) / closes[entryIdx] * 100,
      })
    }

    return trades
  },
}
