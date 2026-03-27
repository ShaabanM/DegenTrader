import type { Algorithm, AlgoInput, AlgoOutput, BacktestTrade } from '../types/market'
import { returns, crossCorrelation } from './utils'

/**
 * Oil Lead-Lag: Oil moves first, VWRA follows 1-2 days later.
 * When oil made a big move recently and cross-correlation at that lag is strong,
 * predict VWRA will follow.
 */
export const oilLeadLag: Algorithm = {
  id: 'oil-lead-lag',
  name: 'Oil Lead-Lag',
  description: 'Exploits the delay between oil moves and VWRA reaction',
  category: 'cross-asset',

  compute(input: AlgoInput): AlgoOutput {
    const { vwraPrices, oilPrices } = input
    const minLen = Math.min(vwraPrices.length, oilPrices.length)
    if (minLen < 15) {
      return { action: 'FLAT', confidence: 0, reasoning: 'Need 15+ days for lead-lag analysis' }
    }

    const vCloses = vwraPrices.slice(0, minLen).map(p => p.close)
    const oCloses = oilPrices.slice(0, minLen).map(p => p.close)
    const oRets = returns(oCloses)
    const vRets = returns(vCloses)

    // Cross-correlation: oil leads VWRA by 1-3 days
    const xcorr = crossCorrelation(oRets.slice(-30), vRets.slice(-30), 3)

    // Find best lag (1-3, not 0 which is contemporaneous)
    let bestLag = 1
    let bestCorr = Math.abs(xcorr[1] || 0)
    for (let lag = 2; lag <= 3; lag++) {
      if (Math.abs(xcorr[lag] || 0) > bestCorr) {
        bestLag = lag
        bestCorr = Math.abs(xcorr[lag] || 0)
      }
    }

    const CORR_THRESHOLD = 0.3
    const MOVE_THRESHOLD = 0.01 // 1%

    if (bestCorr < CORR_THRESHOLD) {
      return {
        action: 'FLAT',
        confidence: 0.2,
        reasoning: `No strong lead-lag signal (best lag-${bestLag} corr: ${(bestCorr * 100).toFixed(0)}%)`,
      }
    }

    // Check if oil moved significantly 'bestLag' days ago
    const laggedOilReturn = oRets[oRets.length - bestLag] || 0
    if (Math.abs(laggedOilReturn) < MOVE_THRESHOLD) {
      return {
        action: 'FLAT',
        confidence: 0.25,
        reasoning: `Oil move ${bestLag}d ago was small (${(laggedOilReturn * 100).toFixed(2)}%), lag-${bestLag} corr: ${(bestCorr * 100).toFixed(0)}%`,
      }
    }

    // Direction follows the sign of the cross-correlation
    const corrSign = xcorr[bestLag] > 0 ? 1 : -1
    const predictedDirection = laggedOilReturn * corrSign > 0 ? 'BUY' : 'SELL'
    const confidence = Math.min(1, bestCorr * Math.abs(laggedOilReturn) / 0.015)

    return {
      action: predictedDirection,
      confidence,
      reasoning: `Oil moved ${(laggedOilReturn * 100).toFixed(2)}% ${bestLag}d ago, lag-${bestLag} correlation ${(xcorr[bestLag] * 100).toFixed(0)}% — VWRA likely follows`,
      entryPrice: input.currentVwra,
    }
  },

  backtest(input: AlgoInput): BacktestTrade[] {
    const { vwraPrices, oilPrices } = input
    const trades: BacktestTrade[] = []
    const minLen = Math.min(vwraPrices.length, oilPrices.length)
    if (minLen < 15) return trades

    const vCloses = vwraPrices.slice(0, minLen).map(p => p.close)
    const oCloses = oilPrices.slice(0, minLen).map(p => p.close)
    const oRets = returns(oCloses)
    const vRets = returns(vCloses)

    let position: 'BUY' | 'SELL' | null = null
    let entryIdx = 0

    for (let i = 15; i < minLen; i++) {
      // Rolling cross-correlation on last 20 bars
      const windowOil = oRets.slice(Math.max(0, i - 20), i + 1)
      const windowVwra = vRets.slice(Math.max(0, i - 20), i + 1)
      const xcorr = crossCorrelation(windowOil, windowVwra, 3)

      let bestLag = 1
      let bestCorr = Math.abs(xcorr[1] || 0)
      for (let lag = 2; lag <= 3; lag++) {
        if (Math.abs(xcorr[lag] || 0) > bestCorr) {
          bestLag = lag
          bestCorr = Math.abs(xcorr[lag] || 0)
        }
      }

      let signal: 'BUY' | 'SELL' | 'FLAT' = 'FLAT'
      if (bestCorr >= 0.3 && i >= bestLag) {
        const laggedOilReturn = oRets[i - bestLag]
        if (Math.abs(laggedOilReturn) >= 0.01) {
          const corrSign = xcorr[bestLag] > 0 ? 1 : -1
          signal = laggedOilReturn * corrSign > 0 ? 'BUY' : 'SELL'
        }
      }

      if (position === null && signal !== 'FLAT') {
        position = signal
        entryIdx = i
      } else if (position !== null && signal !== position) {
        trades.push({
          entryDate: vwraPrices[entryIdx].date,
          exitDate: vwraPrices[i].date,
          entryPrice: vCloses[entryIdx],
          exitPrice: vCloses[i],
          action: position,
          pnl: position === 'BUY' ? vCloses[i] - vCloses[entryIdx] : vCloses[entryIdx] - vCloses[i],
          pnlPct: position === 'BUY'
            ? (vCloses[i] - vCloses[entryIdx]) / vCloses[entryIdx] * 100
            : (vCloses[entryIdx] - vCloses[i]) / vCloses[entryIdx] * 100,
        })
        position = signal === 'FLAT' ? null : signal
        entryIdx = i
      }
    }

    if (position !== null) {
      const lastIdx = minLen - 1
      trades.push({
        entryDate: vwraPrices[entryIdx].date,
        exitDate: vwraPrices[lastIdx].date,
        entryPrice: vCloses[entryIdx],
        exitPrice: vCloses[lastIdx],
        action: position,
        pnl: position === 'BUY' ? vCloses[lastIdx] - vCloses[entryIdx] : vCloses[entryIdx] - vCloses[lastIdx],
        pnlPct: position === 'BUY'
          ? (vCloses[lastIdx] - vCloses[entryIdx]) / vCloses[entryIdx] * 100
          : (vCloses[entryIdx] - vCloses[lastIdx]) / vCloses[entryIdx] * 100,
      })
    }

    return trades
  },
}
