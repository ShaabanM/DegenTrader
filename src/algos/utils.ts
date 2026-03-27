/** Shared math utilities for trading algorithms */

export function sma(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += data[j]
      result.push(sum / period)
    }
  }
  return result
}

export function ema(data: number[], period: number): number[] {
  const result: number[] = []
  const k = 2 / (period + 1)
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0])
    } else {
      result.push(data[i] * k + result[i - 1] * (1 - k))
    }
  }
  return result
}

export function rsi(data: number[], period: number = 14): number[] {
  const result: number[] = new Array(data.length).fill(NaN)
  if (data.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0

  // Initial averages
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  // Subsequent values using smoothed averages
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
    result.push(data[i - 1] !== 0 ? (data[i] - data[i - 1]) / data[i - 1] : 0)
  }
  return result
}

export function stdDev(data: number[], period: number): number[] {
  const means = sma(data, period)
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (isNaN(means[i])) {
      result.push(NaN)
    } else {
      let sumSq = 0
      for (let j = i - period + 1; j <= i; j++) {
        sumSq += (data[j] - means[i]) ** 2
      }
      result.push(Math.sqrt(sumSq / period))
    }
  }
  return result
}

export function rollingCorrelation(a: number[], b: number[], window: number): number[] {
  const result: number[] = []
  for (let i = 0; i < a.length; i++) {
    if (i < window - 1) {
      result.push(NaN)
      continue
    }
    const aSlice = a.slice(i - window + 1, i + 1)
    const bSlice = b.slice(i - window + 1, i + 1)
    result.push(pearsonCorrelation(aSlice, bSlice))
  }
  return result
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0

  let sumA = 0, sumB = 0
  for (let i = 0; i < n; i++) { sumA += a[i]; sumB += b[i] }
  const meanA = sumA / n, meanB = sumB / n

  let cov = 0, varA = 0, varB = 0
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA, dB = b[i] - meanB
    cov += dA * dB
    varA += dA * dA
    varB += dB * dB
  }

  const denom = Math.sqrt(varA * varB)
  return denom === 0 ? 0 : cov / denom
}

export function crossCorrelation(a: number[], b: number[], maxLag: number): number[] {
  // Cross-correlation: how much does a[t-lag] predict b[t]?
  const result: number[] = []
  for (let lag = 0; lag <= maxLag; lag++) {
    const aSlice = a.slice(0, a.length - lag)
    const bSlice = b.slice(lag)
    const n = Math.min(aSlice.length, bSlice.length)
    if (n < 5) { result.push(0); continue }
    result.push(pearsonCorrelation(aSlice.slice(-n), bSlice.slice(-n)))
  }
  return result
}

export function atr(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const result: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    result.push(tr)
  }
  // Smooth with SMA
  return sma(result, period)
}

export function maxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0]
  let maxDd = 0
  for (const val of equityCurve) {
    if (val > peak) peak = val
    const dd = (peak - val) / peak
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

export function sharpeRatio(dailyReturns: number[], riskFreeRate: number = 0.04): number {
  if (dailyReturns.length < 2) return 0
  const dailyRf = riskFreeRate / 252
  const excessReturns = dailyReturns.map(r => r - dailyRf)
  const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length
  const std = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / excessReturns.length
  )
  return std === 0 ? 0 : (mean / std) * Math.sqrt(252)
}
