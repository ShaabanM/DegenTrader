import type { Algorithm, AlgoInput, AlgoOutput, BacktestTrade } from '../types/market'
import { returns, rollingCorrelation } from './utils'

/**
 * Oil-VWRA Momentum: When oil moves big and correlation is high,
 * VWRA follows in the same direction.
 */
export const oilVwraMomentum: Algorithm = {
  id: 'oil-vwra-momentum',
  name: 'Oil Momentum',
  description: 'Follows oil price moves when correlation with VWRA is strong',
  category: 'cross-asset',

  compute(input: AlgoInput): AlgoOutput {
    const { vwraPrices, oilPrices } = input
    if (vwraPrices.length < 10 || oilPrices.length < 10) {
      return { action: 'FLAT', confidence: 0, reasoning: 'Not enough data' }
    }

    const vCloses = vwraPrices.map(p => p.close)
    const oCloses = oilPrices.map(p => p.close)
    const vRets = returns(vCloses)
    const oRets = returns(oCloses)

    // 5-day rolling correlation
    const corr = rollingCorrelation(oRets, vRets, 5)
    const currentCorr = corr[corr.length - 1]

    // Latest oil daily return
    const oilReturn = oRets[oRets.length - 1]

    const CORR_THRESHOLD = 0.4
    const MOVE_THRESHOLD = 0.01 // 1%

    if (isNaN(currentCorr) || Math.abs(currentCorr) < CORR_THRESHOLD) {
      return {
        action: 'FLAT',
        confidence: 0.2,
        reasoning: `Weak oil-VWRA correlation (${(currentCorr * 100 || 0).toFixed(0)}%), waiting for alignment`,
      }
    }

    if (Math.abs(oilReturn) < MOVE_THRESHOLD) {
      return {
        action: 'FLAT',
        confidence: 0.3,
        reasoning: `Oil move too small (${(oilReturn * 100).toFixed(2)}%), correlation ${(currentCorr * 100).toFixed(0)}%`,
      }
    }

    const direction = oilReturn > 0 ? 'BUY' : 'SELL'
    const confidence = Math.min(1, Math.abs(oilReturn) / 0.03 * Math.abs(currentCorr))

    return {
      action: direction,
      confidence,
      reasoning: `Oil ${oilReturn > 0 ? 'up' : 'down'} ${(Math.abs(oilReturn) * 100).toFixed(2)}% with ${(currentCorr * 100).toFixed(0)}% correlation`,
      entryPrice: input.currentVwra,
    }
  },

  backtest(input: AlgoInput): BacktestTrade[] {
    const { vwraPrices, oilPrices } = input
    const trades: BacktestTrade[] = []
    const minLen = Math.min(vwraPrices.length, oilPrices.length)
    if (minLen < 10) return trades

    const vCloses = vwraPrices.slice(0, minLen).map(p => p.close)
    const oCloses = oilPrices.slice(0, minLen).map(p => p.close)
    const vRets = returns(vCloses)
    const oRets = returns(oCloses)
    const corr = rollingCorrelation(oRets, vRets, 5)

    let position: 'BUY' | 'SELL' | null = null
    let entryIdx = 0

    for (let i = 6; i < minLen; i++) {
      const c = corr[i]
      const oRet = oRets[i]
      if (isNaN(c)) continue

      let signal: 'BUY' | 'SELL' | 'FLAT' = 'FLAT'
      if (Math.abs(c) >= 0.4 && Math.abs(oRet) >= 0.01) {
        signal = oRet > 0 ? 'BUY' : 'SELL'
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
          pnl: position === 'BUY'
            ? vCloses[i] - vCloses[entryIdx]
            : vCloses[entryIdx] - vCloses[i],
          pnlPct: position === 'BUY'
            ? (vCloses[i] - vCloses[entryIdx]) / vCloses[entryIdx] * 100
            : (vCloses[entryIdx] - vCloses[i]) / vCloses[entryIdx] * 100,
        })
        position = signal === 'FLAT' ? null : signal
        entryIdx = i
      }
    }

    // Close any open position
    if (position !== null) {
      const lastIdx = minLen - 1
      trades.push({
        entryDate: vwraPrices[entryIdx].date,
        exitDate: vwraPrices[lastIdx].date,
        entryPrice: vCloses[entryIdx],
        exitPrice: vCloses[lastIdx],
        action: position,
        pnl: position === 'BUY'
          ? vCloses[lastIdx] - vCloses[entryIdx]
          : vCloses[entryIdx] - vCloses[lastIdx],
        pnlPct: position === 'BUY'
          ? (vCloses[lastIdx] - vCloses[entryIdx]) / vCloses[entryIdx] * 100
          : (vCloses[entryIdx] - vCloses[lastIdx]) / vCloses[entryIdx] * 100,
      })
    }

    return trades
  },
}
