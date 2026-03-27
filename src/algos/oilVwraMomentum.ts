import type { Algorithm, AlgoInput, AlgoOutput } from '../types/market'
import { runLongFlatSignalBacktest } from './backtest'
import { buildAnalysisSnapshot, clamp, formatSignedPercent } from './utils'

export const oilVwraMomentum: Algorithm = {
  id: 'oil-pressure',
  name: 'Oil Pressure Filter',
  description: 'Uses Brent as a war-risk throttle: buy only when oil pressure eases and VWRA stays above trend.',
  category: 'cross-asset',
  horizon: '2h to 1d',
  minConfidence: 0.5,
  maxHoldBars: 20,

  compute(input: AlgoInput): AlgoOutput {
    const snapshot = buildAnalysisSnapshot(input)
    if (!snapshot) {
      return {
        action: 'FLAT',
        confidence: 0,
        reasoning: 'Waiting for enough aligned VWRA and Brent bars.',
      }
    }

    const buySetup =
      snapshot.latestVwra > snapshot.ema21 &&
      snapshot.oilReturn2h <= -0.004 &&
      snapshot.correlation20 < -0.1 &&
      snapshot.distanceFromVwap > -0.003

    const sellSetup =
      snapshot.latestVwra < snapshot.ema21 ||
      snapshot.oilReturn2h >= 0.008

    if (buySetup) {
      const confidence = clamp(
        0.45 + Math.abs(snapshot.oilReturn2h) * 18 + Math.abs(snapshot.correlation20) * 0.25,
        0,
        0.95,
      )

      return {
        action: 'BUY',
        confidence,
        reasoning: `Oil pressure is easing (${formatSignedPercent(snapshot.oilReturn2h)}) while VWRA holds above its 21-bar trend.`,
        reasons: [
          `Brent is down ${formatSignedPercent(snapshot.oilReturn2h)} over the last 2h.`,
          `VWRA is trading ${(snapshot.distanceFromVwap * 100).toFixed(1)}% vs session VWAP.`,
          `Oil/VWRA correlation is ${(snapshot.correlation20 * 100).toFixed(0)}%, so falling oil is helping the tape.`,
        ],
        metrics: [
          { label: 'Oil 2h', value: formatSignedPercent(snapshot.oilReturn2h), tone: 'positive' },
          { label: 'Corr 20', value: formatSignedPercent(snapshot.correlation20), tone: 'neutral' },
          { label: 'VWRA vs EMA21', value: snapshot.latestVwra > snapshot.ema21 ? 'Above' : 'Below', tone: 'positive' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.ema21,
      }
    }

    if (sellSetup) {
      const confidence = clamp(
        0.4 + Math.max(snapshot.oilReturn2h, 0) * 22 + (snapshot.latestVwra < snapshot.ema21 ? 0.15 : 0),
        0,
        0.95,
      )

      return {
        action: 'SELL',
        confidence,
        reasoning: `Oil pressure is back on (${formatSignedPercent(snapshot.oilReturn2h)}) or VWRA has lost its trend support.`,
        reasons: [
          `Brent is ${snapshot.oilPressure === 'rising' ? 'climbing' : 'not easing'} over the last 2h.`,
          `VWRA is ${snapshot.latestVwra > snapshot.ema21 ? 'testing' : 'below'} its 21-bar trend line.`,
          `This model treats SELL as "go to cash and wait for calmer oil".`,
        ],
        metrics: [
          { label: 'Oil 2h', value: formatSignedPercent(snapshot.oilReturn2h), tone: 'negative' },
          { label: 'VWRA vs EMA21', value: snapshot.latestVwra > snapshot.ema21 ? 'Above' : 'Below', tone: snapshot.latestVwra > snapshot.ema21 ? 'neutral' : 'negative' },
          { label: 'VWAP', value: formatSignedPercent(snapshot.distanceFromVwap), tone: snapshot.distanceFromVwap >= 0 ? 'positive' : 'negative' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.ema21,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.32,
      reasoning: 'Oil is not giving a clean risk-on or risk-off shove right now.',
      reasons: [
        `Brent 2h move is ${formatSignedPercent(snapshot.oilReturn2h)}.`,
        `VWRA is ${(snapshot.distanceFromVwap * 100).toFixed(1)}% vs VWAP.`,
      ],
      metrics: [
        { label: 'Oil 2h', value: formatSignedPercent(snapshot.oilReturn2h), tone: 'neutral' },
        { label: 'Session trend', value: snapshot.sessionTrend.toUpperCase(), tone: 'neutral' },
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
