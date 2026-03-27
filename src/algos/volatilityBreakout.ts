import type { Algorithm, AlgoInput, AlgoOutput } from '../types/market'
import { runLongFlatSignalBacktest } from './backtest'
import { buildAnalysisSnapshot, clamp, formatSignedPercent } from './utils'

export const volatilityBreakout: Algorithm = {
  id: 'opening-range',
  name: 'Opening Range',
  description: 'Trades clean same-session continuation only when VWRA expands beyond the opening range without oil fighting it.',
  category: 'volatility',
  horizon: 'same session',
  minConfidence: 0.48,
  maxHoldBars: 8,

  compute(input: AlgoInput): AlgoOutput {
    const snapshot = buildAnalysisSnapshot(input)
    if (!snapshot || snapshot.sessionBars.length < 3) {
      return {
        action: 'FLAT',
        confidence: 0,
        reasoning: 'The opening range model waits for enough of the London session to print.',
      }
    }

    const buyBreakout =
      snapshot.latestVwra > snapshot.openingRangeHigh &&
      snapshot.rangePosition > 0.7 &&
      snapshot.oilPressure !== 'rising'

    const sellBreakdown =
      snapshot.latestVwra < snapshot.openingRangeLow ||
      (snapshot.oilPressure === 'rising' && snapshot.latestVwra < snapshot.sessionVwap)

    if (buyBreakout) {
      const confidence = clamp(
        0.44 + snapshot.rangePosition * 0.22 + Math.max(0, -snapshot.oilReturn1h) * 14,
        0,
        0.92,
      )

      return {
        action: 'BUY',
        confidence,
        reasoning: 'VWRA is expanding above the opening range and Brent is not sabotaging the breakout.',
        reasons: [
          `Price is above the opening range high (${snapshot.openingRangeHigh.toFixed(2)}).`,
          `Session range position is ${(snapshot.rangePosition * 100).toFixed(0)}%.`,
          `Brent pressure is ${snapshot.oilPressure}.`,
        ],
        metrics: [
          { label: 'Range pos', value: `${(snapshot.rangePosition * 100).toFixed(0)}%`, tone: 'positive' },
          { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: snapshot.oilReturn1h <= 0 ? 'positive' : 'negative' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.sessionVwap,
      }
    }

    if (sellBreakdown) {
      const confidence = clamp(
        0.38 + Math.max(snapshot.oilReturn1h, 0) * 12 + (snapshot.latestVwra < snapshot.openingRangeLow ? 0.16 : 0),
        0,
        0.9,
      )

      return {
        action: 'SELL',
        confidence,
        reasoning: 'The continuation failed or oil is pressing hard enough that the breakout should not be trusted.',
        reasons: [
          `VWRA is ${snapshot.latestVwra < snapshot.openingRangeLow ? 'below' : 'testing'} the opening range floor.`,
          `Brent pressure is ${snapshot.oilPressure}.`,
        ],
        metrics: [
          { label: 'OR low', value: snapshot.openingRangeLow.toFixed(2), tone: 'negative' },
          { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: snapshot.oilReturn1h > 0 ? 'negative' : 'neutral' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.openingRangeLow,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.24,
      reasoning: 'The opening range has not resolved into a clean continuation trade.',
      reasons: [
        `VWRA is still inside or only barely outside the opening range.`,
      ],
      metrics: [
        { label: 'Range pos', value: `${(snapshot.rangePosition * 100).toFixed(0)}%`, tone: 'neutral' },
      ],
    }
  },

  backtest(input: AlgoInput) {
    return runLongFlatSignalBacktest(input, this.compute, {
      warmupBars: 16,
      minConfidence: this.minConfidence,
      maxHoldBars: this.maxHoldBars,
    })
  },
}
