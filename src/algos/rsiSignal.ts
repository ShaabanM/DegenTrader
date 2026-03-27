import type { Algorithm, AlgoInput, AlgoOutput, BacktestTrade } from '../types/market'
import { rsi } from './utils'

/**
 * RSI Signal: Classic 14-period RSI on VWRA.
 * Buy when oversold (RSI < 30), sell when overbought (RSI > 70).
 */
export const rsiSignal: Algorithm = {
  id: 'rsi-signal',
  name: 'RSI Signal',
  description: 'Classic RSI oversold/overbought signals on VWRA',
  category: 'technical',

  compute(input: AlgoInput): AlgoOutput {
    const closes = input.vwraPrices.map(p => p.close)
    if (closes.length < 15) {
      return { action: 'FLAT', confidence: 0, reasoning: 'Need 15+ days for RSI' }
    }

    const rsiValues = rsi(closes, 14)
    const currentRsi = rsiValues[rsiValues.length - 1]

    if (isNaN(currentRsi)) {
      return { action: 'FLAT', confidence: 0, reasoning: 'RSI not yet calculable' }
    }

    if (currentRsi < 30) {
      return {
        action: 'BUY',
        confidence: Math.min(1, (30 - currentRsi) / 30),
        reasoning: `RSI at ${currentRsi.toFixed(1)} — oversold, expecting bounce`,
        entryPrice: input.currentVwra,
      }
    }

    if (currentRsi > 70) {
      return {
        action: 'SELL',
        confidence: Math.min(1, (currentRsi - 70) / 30),
        reasoning: `RSI at ${currentRsi.toFixed(1)} — overbought, expecting pullback`,
        entryPrice: input.currentVwra,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.3,
      reasoning: `RSI at ${currentRsi.toFixed(1)} — neutral zone`,
    }
  },

  backtest(input: AlgoInput): BacktestTrade[] {
    const { vwraPrices } = input
    const trades: BacktestTrade[] = []
    const closes = vwraPrices.map(p => p.close)
    if (closes.length < 20) return trades

    const rsiValues = rsi(closes, 14)

    let position: 'BUY' | 'SELL' | null = null
    let entryIdx = 0

    for (let i = 15; i < closes.length; i++) {
      const r = rsiValues[i]
      if (isNaN(r)) continue

      let signal: 'BUY' | 'SELL' | 'FLAT' = 'FLAT'
      if (r < 30) signal = 'BUY'
      else if (r > 70) signal = 'SELL'
      // Exit when RSI returns to neutral (40-60)
      else if (position !== null && r >= 40 && r <= 60) signal = 'FLAT'
      else if (position !== null) continue

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
