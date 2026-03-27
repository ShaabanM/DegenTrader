import type { Algorithm, AlgoInput, AlgoOutput } from '../types/market'
import { runLongFlatSignalBacktest } from './backtest'
import { buildAnalysisSnapshot, clamp, formatSignedPercent } from './utils'

export const oilLeadLag: Algorithm = {
  id: 'oil-shock',
  name: 'Oil Shock Guard',
  description: 'Protects capital when Brent spikes fast and the negative oil/VWRA relationship is biting hard.',
  category: 'cross-asset',
  horizon: 'next few bars',
  minConfidence: 0.5,
  maxHoldBars: 12,

  compute(input: AlgoInput): AlgoOutput {
    const snapshot = buildAnalysisSnapshot(input)
    if (!snapshot) {
      return {
        action: 'FLAT',
        confidence: 0,
        reasoning: 'Need enough overlapping VWRA and Brent bars to judge an oil shock.',
      }
    }

    const negativeRegime = snapshot.correlation20 < -0.25
    const oilShockUp = snapshot.oilReturn2h > 0.01
    const oilShockDown = snapshot.oilReturn2h < -0.008

    if (negativeRegime && oilShockUp && (snapshot.latestVwra < snapshot.ema21 || snapshot.distanceFromVwap < 0)) {
      const confidence = clamp(
        0.46 + snapshot.oilReturn2h * 18 + Math.abs(snapshot.correlation20) * 0.22,
        0,
        0.95,
      )

      return {
        action: 'SELL',
        confidence,
        reasoning: 'Brent is surging fast in a clearly negative correlation regime, so this model prefers cash over hoping VWRA shrugs it off.',
        reasons: [
          `Brent is up ${formatSignedPercent(snapshot.oilReturn2h)} over 2h.`,
          `Oil/VWRA correlation is ${(snapshot.correlation20 * 100).toFixed(0)}%.`,
          `VWRA is ${snapshot.latestVwra < snapshot.ema21 ? 'under trend' : 'under VWAP'}.`,
        ],
        metrics: [
          { label: 'Oil 2h', value: formatSignedPercent(snapshot.oilReturn2h), tone: 'negative' },
          { label: 'Corr 20', value: formatSignedPercent(snapshot.correlation20), tone: 'negative' },
          { label: 'VWAP', value: formatSignedPercent(snapshot.distanceFromVwap), tone: snapshot.distanceFromVwap >= 0 ? 'neutral' : 'negative' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.ema21,
      }
    }

    if (negativeRegime && oilShockDown && snapshot.latestVwra > snapshot.ema8) {
      const confidence = clamp(
        0.42 + Math.abs(snapshot.oilReturn2h) * 16 + Math.abs(snapshot.correlation20) * 0.18,
        0,
        0.9,
      )

      return {
        action: 'BUY',
        confidence,
        reasoning: 'Oil stress is easing quickly and VWRA is already reclaiming short-term trend, so the shock guard flips back on.',
        reasons: [
          `Brent is down ${formatSignedPercent(snapshot.oilReturn2h)} over 2h.`,
          `VWRA is back above its 8-bar trend line.`,
        ],
        metrics: [
          { label: 'Oil 2h', value: formatSignedPercent(snapshot.oilReturn2h), tone: 'positive' },
          { label: 'EMA8', value: snapshot.ema8.toFixed(2), tone: 'positive' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.ema21,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.26,
      reasoning: 'No oil shock edge here. Brent and VWRA are moving, but not in a way that forces a tactical cash move.',
      reasons: [
        `Brent 2h move is ${formatSignedPercent(snapshot.oilReturn2h)}.`,
        `Correlation is ${(snapshot.correlation20 * 100).toFixed(0)}%.`,
      ],
      metrics: [
        { label: 'Oil 2h', value: formatSignedPercent(snapshot.oilReturn2h), tone: 'neutral' },
        { label: 'Corr 20', value: formatSignedPercent(snapshot.correlation20), tone: 'neutral' },
      ],
    }
  },

  backtest(input: AlgoInput) {
    return runLongFlatSignalBacktest(input, this.compute, {
      warmupBars: 25,
      minConfidence: this.minConfidence,
      maxHoldBars: this.maxHoldBars,
    })
  },
}
