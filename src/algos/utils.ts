import type { AlgoInput, AlignedPriceBar, AnalysisSnapshot, PricePoint } from '../types/market'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function sma(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(Number.NaN)
      continue
    }

    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    result.push(sum / period)
  }
  return result
}

export function ema(data: number[], period: number): number[] {
  const result: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0] ?? 0)
    } else {
      result.push(data[i] * multiplier + result[i - 1] * (1 - multiplier))
    }
  }

  return result
}

export function rsi(data: number[], period: number = 14): number[] {
  const result: number[] = new Array(data.length).fill(Number.NaN)
  if (data.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }

  avgGain /= period
  avgLoss /= period
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  return result
}

export function returns(data: number[]): number[] {
  const result: number[] = [0]
  for (let i = 1; i < data.length; i++) {
    result.push(percentChange(data[i - 1], data[i]))
  }
  return result
}

export function percentChange(from: number, to: number): number {
  return from !== 0 ? (to - from) / from : 0
}

export function stdDev(data: number[], period: number): number[] {
  const means = sma(data, period)
  const result: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (Number.isNaN(means[i])) {
      result.push(Number.NaN)
      continue
    }

    let sumSq = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += (data[j] - means[i]) ** 2
    }
    result.push(Math.sqrt(sumSq / period))
  }

  return result
}

export function rollingCorrelation(a: number[], b: number[], window: number): number[] {
  const result: number[] = []
  for (let i = 0; i < a.length; i++) {
    if (i < window - 1) {
      result.push(Number.NaN)
      continue
    }

    result.push(pearsonCorrelation(
      a.slice(i - window + 1, i + 1),
      b.slice(i - window + 1, i + 1),
    ))
  }
  return result
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0

  let sumA = 0
  let sumB = 0
  for (let i = 0; i < n; i++) {
    sumA += a[i]
    sumB += b[i]
  }

  const meanA = sumA / n
  const meanB = sumB / n

  let covariance = 0
  let varianceA = 0
  let varianceB = 0

  for (let i = 0; i < n; i++) {
    const diffA = a[i] - meanA
    const diffB = b[i] - meanB
    covariance += diffA * diffB
    varianceA += diffA * diffA
    varianceB += diffB * diffB
  }

  const denominator = Math.sqrt(varianceA * varianceB)
  return denominator === 0 ? 0 : covariance / denominator
}

export function crossCorrelation(a: number[], b: number[], maxLag: number): number[] {
  const result: number[] = []

  for (let lag = 0; lag <= maxLag; lag++) {
    const leading = a.slice(0, a.length - lag)
    const lagging = b.slice(lag)
    const n = Math.min(leading.length, lagging.length)

    if (n < 5) {
      result.push(0)
      continue
    }

    result.push(pearsonCorrelation(
      leading.slice(-n),
      lagging.slice(-n),
    ))
  }

  return result
}

export function atr(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const ranges: number[] = []

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      ranges.push(highs[0] - lows[0])
      continue
    }

    ranges.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ))
  }

  return sma(ranges, period)
}

export function maxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 0
  let maxDd = 0

  for (const value of equityCurve) {
    if (value > peak) peak = value
    if (peak === 0) continue

    const drawdown = (peak - value) / peak
    if (drawdown > maxDd) maxDd = drawdown
  }

  return maxDd
}

export function sharpeRatio(periodReturns: number[], riskFreeRate: number = 0.04): number {
  if (periodReturns.length < 2) return 0

  const periodRiskFree = riskFreeRate / 252
  const excessReturns = periodReturns.map(value => value - periodRiskFree)
  const mean = excessReturns.reduce((sum, value) => sum + value, 0) / excessReturns.length
  const variance = excessReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / excessReturns.length
  const stdev = Math.sqrt(variance)

  return stdev === 0 ? 0 : (mean / stdev) * Math.sqrt(252)
}

export function alignPriceSeries(vwraPrices: PricePoint[], oilPrices: PricePoint[]): AlignedPriceBar[] {
  const oilMap = new Map(oilPrices.map(point => [point.date, point]))
  return vwraPrices
    .map(point => ({
      date: point.date,
      vwra: point,
      oil: oilMap.get(point.date),
    }))
    .filter((bar): bar is AlignedPriceBar => bar.oil !== undefined)
}

function sessionKey(date: string): string {
  return date.slice(0, 10)
}

export function getSessionBars(bars: AlignedPriceBar[]): AlignedPriceBar[] {
  if (bars.length === 0) return []
  const latestKey = sessionKey(bars[bars.length - 1].date)
  return bars.filter(bar => sessionKey(bar.date) === latestKey)
}

export function sessionVwap(bars: AlignedPriceBar[]): number {
  let totalPriceVolume = 0
  let totalVolume = 0

  for (const bar of bars) {
    const typicalPrice = (bar.vwra.high + bar.vwra.low + bar.vwra.close) / 3
    const volume = Math.max(bar.vwra.volume, 1)
    totalPriceVolume += typicalPrice * volume
    totalVolume += volume
  }

  return totalVolume > 0 ? totalPriceVolume / totalVolume : bars[bars.length - 1]?.vwra.close ?? 0
}

export function buildAnalysisSnapshot(input: AlgoInput): AnalysisSnapshot | null {
  const bars = alignPriceSeries(input.vwraPrices, input.oilPrices)
  if (bars.length < 30) return null

  const closes = bars.map(bar => bar.vwra.close)
  const oilCloses = bars.map(bar => bar.oil.close)
  const vwraReturns = returns(closes)
  const oilReturns = returns(oilCloses)
  const ema8Series = ema(closes, 8)
  const ema21Series = ema(closes, 21)
  const ema55Series = ema(closes, 55)
  const rsiSeries = rsi(closes, 14)
  const mean20 = sma(closes, 20)
  const std20 = stdDev(closes, 20)
  const xcorr = crossCorrelation(oilReturns.slice(-30), vwraReturns.slice(-30), 2)
  const sessionBars = getSessionBars(bars)

  const latestBar = bars[bars.length - 1]
  const latestVwra = input.currentVwra || latestBar.vwra.close
  const latestOil = input.currentOil || latestBar.oil.close
  const latestIndex = bars.length - 1
  const sessionStart = sessionBars[0] ?? latestBar
  const openingRangeBars = sessionBars.slice(0, Math.min(2, sessionBars.length))
  const openingRangeHigh = Math.max(...openingRangeBars.map(bar => bar.vwra.high))
  const openingRangeLow = Math.min(...openingRangeBars.map(bar => bar.vwra.low))
  const latestSessionHigh = Math.max(...sessionBars.map(bar => bar.vwra.high))
  const latestSessionLow = Math.min(...sessionBars.map(bar => bar.vwra.low))
  const vwap = sessionVwap(sessionBars)
  const sessionRange = latestSessionHigh - latestSessionLow || 1
  const rangePosition = clamp((latestVwra - latestSessionLow) / sessionRange, 0, 1)
  const oil2hBase = oilCloses[Math.max(0, latestIndex - 4)] ?? latestOil
  const oil1hBase = oilCloses[Math.max(0, latestIndex - 2)] ?? latestOil
  const oil30mBase = oilCloses[Math.max(0, latestIndex - 1)] ?? latestOil
  const vwra2hBase = closes[Math.max(0, latestIndex - 4)] ?? latestVwra
  const vwra1hBase = closes[Math.max(0, latestIndex - 2)] ?? latestVwra
  const vwra30mBase = closes[Math.max(0, latestIndex - 1)] ?? latestVwra
  const correlationWindow = 20
  const correlation20 = pearsonCorrelation(
    oilReturns.slice(-correlationWindow),
    vwraReturns.slice(-correlationWindow),
  )

  const oilPressure: AnalysisSnapshot['oilPressure'] =
    percentChange(oil2hBase, latestOil) > 0.006
      ? 'rising'
      : percentChange(oil2hBase, latestOil) < -0.004
        ? 'falling'
        : 'stable'

  const sessionTrend: AnalysisSnapshot['sessionTrend'] =
    latestVwra > ema8Series[latestIndex] && latestVwra > vwap
      ? 'up'
      : latestVwra < ema21Series[latestIndex] && latestVwra < vwap
        ? 'down'
        : 'mixed'

  return {
    bars,
    latest: latestBar,
    latestVwra,
    latestOil,
    sessionBars,
    ema8: ema8Series[latestIndex],
    ema21: ema21Series[latestIndex],
    ema55: ema55Series[latestIndex],
    rsi14: rsiSeries[latestIndex],
    zScore20: std20[latestIndex] > 0
      ? (latestVwra - mean20[latestIndex]) / std20[latestIndex]
      : 0,
    correlation20,
    lagCorrelation1: xcorr[1] ?? 0,
    lagCorrelation2: xcorr[2] ?? 0,
    oilReturn30m: percentChange(oil30mBase, latestOil),
    oilReturn1h: percentChange(oil1hBase, latestOil),
    oilReturn2h: percentChange(oil2hBase, latestOil),
    oilSessionReturn: percentChange(sessionStart.oil.open, latestOil),
    vwraReturn30m: percentChange(vwra30mBase, latestVwra),
    vwraReturn1h: percentChange(vwra1hBase, latestVwra),
    vwraReturn2h: percentChange(vwra2hBase, latestVwra),
    vwraSessionReturn: percentChange(sessionStart.vwra.open, latestVwra),
    sessionVwap: vwap,
    distanceFromVwap: percentChange(vwap, latestVwra),
    openingRangeHigh,
    openingRangeLow,
    rangePosition,
    sessionTrend,
    oilPressure,
  }
}

export function formatSignedPercent(value: number, digits: number = 1): string {
  const pct = value * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(digits)}%`
}
