import type { Algorithm, AlgoInput, AlgoOutput } from '../types/market'
import { runLongFlatSignalBacktest } from './backtest'
import { buildAnalysisSnapshot, clamp, formatSignedPercent } from './utils'

export const meanReversion: Algorithm = {
  id: 'mean-reversion',
  name: 'Mean Reversion',
  description: 'Buys sharp VWRA washouts when oil is not actively getting worse, then hands risk back once price normalizes.',
  category: 'mean-reversion',
  horizon: '1h to 1d',
  minConfidence: 0.52,
  maxHoldBars: 14,

  compute(input: AlgoInput): AlgoOutput {
    const snapshot = buildAnalysisSnapshot(input)
    if (!snapshot) {
      return {
        action: 'FLAT',
        confidence: 0,
        reasoning: 'Need a deeper intraday sample before mean-reversion becomes trustworthy.',
      }
    }

    const oversold = snapshot.zScore20 <= -1.45 && snapshot.rsi14 < 40
    const overbought = snapshot.zScore20 >= 1.05
    const oilNotWorsening = snapshot.oilReturn1h < 0.003
    const bounceConfirmed = snapshot.latestVwra > snapshot.sessionVwap || snapshot.vwraReturn30m > 0

    if (oversold && oilNotWorsening && bounceConfirmed) {
      const confidence = clamp(
        0.45 + Math.abs(snapshot.zScore20) * 0.12 + Math.max(0, 45 - snapshot.rsi14) * 0.01,
        0,
        0.96,
      )

      return {
        action: 'BUY',
        confidence,
        reasoning: `VWRA is stretched ${snapshot.zScore20.toFixed(1)} standard deviations below its 20-bar mean and is starting to stabilize.`,
        reasons: [
          `RSI is ${snapshot.rsi14.toFixed(0)}, which is washed out for this tape.`,
          `Brent 1h move is ${formatSignedPercent(snapshot.oilReturn1h)}, so oil is not escalating into the bounce.`,
          `Price is ${snapshot.latestVwra > snapshot.sessionVwap ? 'back above' : 'recovering toward'} session VWAP.`,
        ],
        metrics: [
          { label: 'Z-score', value: snapshot.zScore20.toFixed(2), tone: 'positive' },
          { label: 'RSI', value: snapshot.rsi14.toFixed(0), tone: 'neutral' },
          { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: snapshot.oilReturn1h <= 0 ? 'positive' : 'negative' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.sessionVwap,
      }
    }

    if (overbought || snapshot.oilReturn1h > 0.005) {
      const confidence = clamp(
        0.35 + Math.max(snapshot.zScore20, 0) * 0.14 + Math.max(snapshot.oilReturn1h, 0) * 18,
        0,
        0.9,
      )

      return {
        action: 'SELL',
        confidence,
        reasoning: 'The rebound is stretched or oil is turning hot again, so this mean-reversion trade is done.',
        reasons: [
          `VWRA z-score is ${snapshot.zScore20.toFixed(1)}.`,
          `Brent 1h move is ${formatSignedPercent(snapshot.oilReturn1h)}.`,
          `This model exits to cash once the bounce looks crowded.`,
        ],
        metrics: [
          { label: 'Z-score', value: snapshot.zScore20.toFixed(2), tone: snapshot.zScore20 > 0 ? 'negative' : 'neutral' },
          { label: 'Oil 1h', value: formatSignedPercent(snapshot.oilReturn1h), tone: snapshot.oilReturn1h > 0 ? 'negative' : 'neutral' },
        ],
        entryPrice: snapshot.latestVwra,
        exitPrice: snapshot.sessionVwap,
      }
    }

    return {
      action: 'FLAT',
      confidence: 0.28,
      reasoning: 'VWRA is not stretched enough for a clean fade here.',
      reasons: [
        `Z-score is ${snapshot.zScore20.toFixed(1)} and RSI is ${snapshot.rsi14.toFixed(0)}.`,
      ],
      metrics: [
        { label: 'Z-score', value: snapshot.zScore20.toFixed(2), tone: 'neutral' },
        { label: 'RSI', value: snapshot.rsi14.toFixed(0), tone: 'neutral' },
      ],
    }
  },

  backtest(input: AlgoInput) {
    return runLongFlatSignalBacktest(input, this.compute, {
      warmupBars: 24,
      minConfidence: this.minConfidence,
      maxHoldBars: this.maxHoldBars,
    })
  },
}
