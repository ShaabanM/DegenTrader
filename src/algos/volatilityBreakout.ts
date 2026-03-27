import type { Algorithm, AlgoInput, AlgoOutput, BacktestTrade } from '../types/market'
import { atr } from './utils'

/**
 * Volatility Breakout: When today's range exceeds 1.5x ATR and the close
 * is directional, signal a continuation.
 */
export const volatilityBreakout: Algorithm = {
  id: 'volatility-breakout',
  name: 'Vol Breakout',
  description: 'Catches trend continuations when volatility spikes with direction',
  category: 'volatility',

  compute(input: AlgoInput): AlgoOutput {
    const { vwraPrices, currentVwra } = input
    if (vwraPrices.length < 12) {
      return { action: 'FLAT', confidence: 0, reasoning: 'Need 12+ days for ATR' }
    }

    const highs = vwraPrices.map(p => p.high)
    const lows = vwraPrices.map(p => p.low)
    const closes = vwraPrices.map(p => p.close)

    const atrValues = atr(highs, lows, closes, 10)
    const currentAtr = atrValues[atrValues.length - 1]

    if (isNaN(currentAtr) || currentAtr === 0) {
      return { action: 'FLAT', confidence: 0, reasoning: 'ATR not calculable' }
    }

    const last = vwraPrices[vwraPrices.length - 1]
    const todayRange = last.high - last.low
    const rangeRatio = todayRange / currentAtr
    const ATR_MULT = 1.5

    if (rangeRatio < ATR_MULT) {
      return {
        action: 'FLAT',
        confidence: 0.2,
        reasoning: `Range ${rangeRatio.toFixed(1)}x ATR — below breakout threshold (${ATR_MULT}x)`,
      }
    }

    // Where did we close in the day's range?
    const closePosition = todayRange > 0 ? (currentVwra - last.low) / todayRange : 0.5

    if (closePosition > 0.75) {
      return {
        action: 'BUY',
        confidence: Math.min(1, (rangeRatio - 1) / 2),
        reasoning: `Volatility breakout: range ${rangeRatio.toFixed(1)}x ATR, closed in top ${((1 - closePosition) * 100).toFixed(0)}% — bullish continuation`,
        entryPrice: currentVwra,
      }
    }

    if (closePosition < 0.25) {
      return {
        action: 'SELL',
        confidence: Math.min(1, (rangeRatio - 1) / 2),
        reasoning: `Volatility breakout: range ${rangeRatio.toFixed(1)}x ATR, closed in bottom ${(closePosition * 100).toFixed(0)}% — bearish continuation`,
        entryPrice: currentVwra,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.3,
      reasoning: `High vol (${rangeRatio.toFixed(1)}x ATR) but no directional close (mid-range)`,
    }
  },

  backtest(input: AlgoInput): BacktestTrade[] {
    const { vwraPrices } = input
    const trades: BacktestTrade[] = []
    if (vwraPrices.length < 15) return trades

    const highs = vwraPrices.map(p => p.high)
    const lows = vwraPrices.map(p => p.low)
    const closes = vwraPrices.map(p => p.close)
    const atrValues = atr(highs, lows, closes, 10)

    let position: 'BUY' | 'SELL' | null = null
    let entryIdx = 0

    for (let i = 11; i < vwraPrices.length; i++) {
      const currentAtr = atrValues[i]
      if (isNaN(currentAtr) || currentAtr === 0) continue

      const todayRange = highs[i] - lows[i]
      const rangeRatio = todayRange / currentAtr
      const closePos = todayRange > 0 ? (closes[i] - lows[i]) / todayRange : 0.5

      let signal: 'BUY' | 'SELL' | 'FLAT' = 'FLAT'
      if (rangeRatio >= 1.5) {
        if (closePos > 0.75) signal = 'BUY'
        else if (closePos < 0.25) signal = 'SELL'
      }

      if (position === null && signal !== 'FLAT') {
        position = signal
        entryIdx = i
      } else if (position !== null && signal !== position) {
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
