import type { MarketData, PricePoint } from '../types/market'

const YAHOO_CHART_PATH = '/v8/finance/chart'
const isDev = import.meta.env.DEV
const CF_WORKER_URL = import.meta.env.VITE_API_WORKER_URL as string | undefined

const SYMBOL_META: Record<string, { name: string; exchange: string; currency: string; expenseRatio: number }> = {
  'VWRA.L': { name: 'Vanguard FTSE All-World UCITS ETF', exchange: 'LSE', currency: 'USD', expenseRatio: 0.0019 },
  'BZ=F': { name: 'Brent Crude Oil Futures', exchange: 'ICE', currency: 'USD', expenseRatio: 0 },
}

type ChartResult = {
  meta?: {
    regularMarketPrice?: number
    chartPreviousClose?: number
    previousClose?: number
    regularMarketOpen?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
    dayHigh?: number
    dayLow?: number
    regularMarketVolume?: number
    regularMarketTime?: number
  }
  timestamp?: number[]
  indicators?: {
    quote?: Array<Record<string, Array<number | null>>>
  }
}

async function fetchFromYahoo(chartPath: string): Promise<unknown> {
  const errors: string[] = []

  if (isDev) {
    try {
      const response = await fetch(`/api/yahoo${chartPath}`)
      if (response.ok) return response.json()
      errors.push(`dev-proxy: HTTP ${response.status}`)
    } catch (error) {
      errors.push(`dev-proxy: ${(error as Error).message}`)
    }
  }

  if (CF_WORKER_URL) {
    try {
      const response = await fetch(`${CF_WORKER_URL}${chartPath}`)
      if (response.ok) return response.json()
      errors.push(`cf-worker: HTTP ${response.status}`)
    } catch (error) {
      errors.push(`cf-worker: ${(error as Error).message}`)
    }
  }

  const yahooUrl = `https://query2.finance.yahoo.com${chartPath}`

  try {
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`)
    if (response.ok) return response.json()
    errors.push(`allorigins-raw: HTTP ${response.status}`)
  } catch (error) {
    errors.push(`allorigins-raw: ${(error as Error).message}`)
  }

  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`)
    if (response.ok) {
      const wrapper = await response.json() as { contents?: string }
      if (wrapper.contents) return JSON.parse(wrapper.contents)
    }
    errors.push(`allorigins-get: HTTP ${response.status}`)
  } catch (error) {
    errors.push(`allorigins-get: ${(error as Error).message}`)
  }

  throw new Error(`All market data sources failed: ${errors.join('; ')}`)
}

function parseChartResponse(data: unknown): ChartResult {
  const result = (data as { chart?: { result?: ChartResult[] } })?.chart?.result?.[0]
  if (!result?.meta) throw new Error('No market data returned from Yahoo Finance')
  return result
}

function toPricePoints(result: ChartResult): PricePoint[] {
  const timestamps = result.timestamp ?? []
  const quotes = result.indicators?.quote?.[0] ?? {}

  return timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString(),
      open: quotes.open?.[index] ?? 0,
      high: quotes.high?.[index] ?? 0,
      low: quotes.low?.[index] ?? 0,
      close: quotes.close?.[index] ?? 0,
      volume: quotes.volume?.[index] ?? 0,
    }))
    .filter(point => point.open > 0 && point.high > 0 && point.low > 0 && point.close > 0)
}

async function fetchChart(symbol: string, query: string): Promise<ChartResult> {
  return parseChartResponse(await fetchFromYahoo(`${YAHOO_CHART_PATH}/${symbol}?${query}`))
}

export async function fetchMarketData(symbol: string = 'VWRA.L'): Promise<MarketData> {
  const [intraday, yearly] = await Promise.all([
    fetchChart(symbol, 'range=1d&interval=5m'),
    fetchChart(symbol, 'range=1y&interval=1wk'),
  ])

  const yearCloses = toPricePoints(yearly).map(point => point.close)
  const meta = intraday.meta ?? {}
  const info = SYMBOL_META[symbol] ?? { name: symbol, exchange: '', currency: 'USD', expenseRatio: 0 }

  return {
    symbol: symbol.replace('.L', '').replace('=F', ''),
    name: info.name,
    exchange: info.exchange,
    currency: info.currency,
    price: meta.regularMarketPrice ?? 0,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
    open: meta.regularMarketOpen ?? 0,
    dayHigh: meta.regularMarketDayHigh ?? meta.dayHigh ?? 0,
    dayLow: meta.regularMarketDayLow ?? meta.dayLow ?? 0,
    volume: meta.regularMarketVolume ?? 0,
    avgVolume: symbol === 'VWRA.L' ? 55000 : 0,
    week52High: yearCloses.length > 0 ? Math.max(...yearCloses) : 0,
    week52Low: yearCloses.length > 0 ? Math.min(...yearCloses) : 0,
    marketCap: 0,
    nav: meta.regularMarketPrice ?? 0,
    expenseRatio: info.expenseRatio,
    timestamp: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
  }
}

export async function fetchMultiSymbolData(symbols: string[]): Promise<Record<string, MarketData>> {
  const results = await Promise.all(symbols.map(symbol => fetchMarketData(symbol)))
  return Object.fromEntries(symbols.map((symbol, index) => [symbol, results[index]]))
}

export async function fetchPriceHistory(
  symbol: string = 'VWRA.L',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo',
): Promise<PricePoint[]> {
  const intervalMap: Record<typeof range, string> = {
    '1d': '5m',
    '5d': '15m',
    '1mo': '30m',
    '3mo': '60m',
    '6mo': '1d',
    '1y': '1wk',
  }

  const result = await fetchChart(symbol, `range=${range}&interval=${intervalMap[range]}`)
  return toPricePoints(result)
}

export async function fetchHistoricalData(
  symbol: string,
  startDate: Date = new Date('2026-03-01T00:00:00Z'),
  interval: '30m' | '60m' | '1d' = '30m',
): Promise<PricePoint[]> {
  const cacheKey = `hist_${symbol}_${startDate.toISOString()}_${interval}`
  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { ts: number; data: PricePoint[] }
      const ttl = interval === '1d' ? 30 * 60 * 1000 : 2 * 60 * 1000
      if (Date.now() - parsed.ts < ttl) return parsed.data
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  const period1 = Math.floor(startDate.getTime() / 1000)
  const period2 = Math.floor(Date.now() / 1000)
  const result = await fetchChart(symbol, `period1=${period1}&period2=${period2}&interval=${interval}`)
  const points = toPricePoints(result)

  localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: points }))
  return points
}
