import type { Algorithm, AlgoInput, AlgoOutput } from '../types/market'
import { runLongFlatSignalBacktest } from './backtest'
import { buildAnalysisSnapshot, clamp, formatSignedPercent } from './utils'

export const rsiSignal: Algorithm = {
  id: 'session-strength',
  name: 'Session Strength',
  description: 'Leans long when VWRA breaks the first-hour highs with calm oil and stays above VWAP.',
  category: 'technical',
  horizon: 'same session',
  minConfidence: 0.5,
  maxHoldBars: 10,

  compute(input: AlgoInput): AlgoOutput {
    const snapshot = buildAnalysisSnapshot(input)
    if (!snapshot || snapshot.sessionBars.length < 3) {
      return {
        action: 'FLAT',
        confidence: 0,
        reasoning: 'Waiting for the first hour to finish before using the session-strength model.',
      }
    }

    const breakoutUp =
      snapshot.latestVwra > snapshot.openingRangeHigh &&
      snapshot.latestVwra > snapshot.sessionVwap &&
      snapshot.oilReturn1h <= 0.002

    const breakdown =
      snapshot.latestVwra < snapshot.openingRangeLow ||
      (snapshot.oilReturn1h > 0.006 && snapshot.rangePosition < 0.45)

    if (breakoutUp) {
      const confidence = clamp(
        0.48 + snapshot.rangePosition * 0.18 + Math.max(0, -snapshot.oilReturn1h) * 18,
        0,
        0.94,
      )

      return {
        action: 'BUY',
        confidence,
        reasoning: 'VWRA has punched through the first-hour range and is holding above VWAP while Brent stays tame.',
        reasons: [
          `Price is above the opening range high (${snapshot.openingRangeHigh.toFixed(2)}).`,
          `VWRA is ${(snapshot.distanceFromVwap * 100).toFixed(1)}% vs session VWAP.`,
          `Brent 1h move is ${formatSignedPercent(snapshot.oilReturn1h)}.`,
        ],
        metrics: [
          { label: 'OR high', value: snapshot.openingRangeHigh.toFixed(2), tone: 'positive' },
          { label: 'VWAP', value: formatSignedPercent(snapshot.distanceFromVwap), tone: snapshot.distanceFromVwap >= 0 ? 'positive' : 'negative' },
          { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: snapshot.oilReturn1h <= 0 ? 'positive' : 'negative' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.sessionVwap,
      }
    }

    if (breakdown) {
      const confidence = clamp(
        0.38 + Math.max(snapshot.oilReturn1h, 0) * 16 + (snapshot.latestVwra < snapshot.openingRangeLow ? 0.12 : 0),
        0,
        0.92,
      )

      return {
        action: 'SELL',
        confidence,
        reasoning: 'The session breakout failed or oil is heating up too much for a clean continuation.',
        reasons: [
          `VWRA is ${snapshot.latestVwra < snapshot.openingRangeLow ? 'under' : 'threatening'} the opening range low.`,
          `Brent 1h move is ${formatSignedPercent(snapshot.oilReturn1h)}.`,
        ],
        metrics: [
          { label: 'OR low', value: snapshot.openingRangeLow.toFixed(2), tone: 'negative' },
          { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: 'negative' },
          { label: 'Range pos', value: `${(snapshot.rangePosition * 100).toFixed(0)}%`, tone: snapshot.rangePosition > 0.5 ? 'neutral' : 'negative' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.openingRangeLow,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.3,
      reasoning: 'VWRA is still trapped inside the opening range or oil is muddying the breakout.',
      reasons: [
        `Range position is ${(snapshot.rangePosition * 100).toFixed(0)}% of the day’s range.`,
      ],
      metrics: [
        { label: 'Range pos', value: `${(snapshot.rangePosition * 100).toFixed(0)}%`, tone: 'neutral' },
        { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: 'neutral' },
      ],
    }
  },

  backtest(input: AlgoInput) {
    return runLongFlatSignalBacktest(input, this.compute, {
      warmupBars: 18,
      minConfidence: this.minConfidence,
      maxHoldBars: this.maxHoldBars,
    })
  },
}
