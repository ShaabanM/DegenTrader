import type { MarketData, PricePoint } from '../types/market'

/**
 * Market data service - fetches data from Yahoo Finance chart API.
 *
 * Data flow:
 *   Development: Vite dev proxy (/api/yahoo -> query2.finance.yahoo.com)
 *   Production:  CF Worker proxy -> allorigins fallback
 */

const YAHOO_CHART_PATH = '/v8/finance/chart'

const isDev = import.meta.env.DEV

// CF Worker URL - set via VITE_API_WORKER_URL env var at build time
const CF_WORKER_URL = import.meta.env.VITE_API_WORKER_URL as string | undefined

// Symbol metadata for display
const SYMBOL_META: Record<string, { name: string; exchange: string; currency: string; expenseRatio: number }> = {
  'VWRA.L': { name: 'Vanguard FTSE All-World UCITS ETF', exchange: 'LSE', currency: 'USD', expenseRatio: 0.0019 },
  'BZ=F': { name: 'Brent Crude Oil Futures', exchange: 'NYMEX', currency: 'USD', expenseRatio: 0 },
  'CL=F': { name: 'WTI Crude Oil Futures', exchange: 'NYMEX', currency: 'USD', expenseRatio: 0 },
}

async function fetchFromYahoo(chartPath: string): Promise<unknown> {
  const errors: string[] = []

  // In development, use Vite's built-in proxy (no CORS issues)
  if (isDev) {
    try {
      const resp = await fetch(`/api/yahoo${chartPath}`)
      if (resp.ok) return resp.json()
      errors.push(`dev-proxy: HTTP ${resp.status}`)
    } catch (err) {
      errors.push(`dev-proxy: ${(err as Error).message}`)
    }
  }

  // Try Cloudflare Worker proxy (production primary)
  if (CF_WORKER_URL) {
    try {
      const resp = await fetch(`${CF_WORKER_URL}${chartPath}`)
      if (resp.ok) return resp.json()
      errors.push(`cf-worker: HTTP ${resp.status}`)
    } catch (err) {
      errors.push(`cf-worker: ${(err as Error).message}`)
    }
  }

  // Fallback: allorigins (wraps Yahoo response, adds CORS)
  const yahooUrl = `https://query2.finance.yahoo.com${chartPath}`

  // Try allorigins /raw first (returns raw JSON)
  try {
    const resp = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`
    )
    if (resp.ok) return resp.json()
    errors.push(`allorigins-raw: HTTP ${resp.status}`)
  } catch (err) {
    errors.push(`allorigins-raw: ${(err as Error).message}`)
  }

  // Try allorigins /get (wraps in {contents: "..."} envelope)
  try {
    const resp = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`
    )
    if (resp.ok) {
      const wrapper = (await resp.json()) as { contents?: string }
      if (wrapper?.contents) return JSON.parse(wrapper.contents)
    }
    errors.push(`allorigins-get: HTTP ${resp.status}`)
  } catch (err) {
    errors.push(`allorigins-get: ${(err as Error).message}`)
  }

  throw new Error(`All data sources failed: ${errors.join('; ')}`)
}

function parseChartResponse(data: unknown) {
  const result = (data as { chart?: { result?: unknown[] } })?.chart
    ?.result?.[0] as
    | {
        meta?: Record<string, unknown>
        timestamp?: number[]
        indicators?: { quote?: Record<string, (number | null)[]>[] }
      }
    | undefined
  if (!result?.meta) throw new Error('No data returned from Yahoo Finance')
  return result
}

export async function fetchMarketData(symbol: string = 'VWRA.L'): Promise<MarketData> {
  // Fetch both 1d (for current data) and 1y (for accurate 52-week range)
  const [dayData, yearData] = await Promise.all([
    fetchFromYahoo(`${YAHOO_CHART_PATH}/${symbol}?range=1d&interval=5m`),
    fetchFromYahoo(`${YAHOO_CHART_PATH}/${symbol}?range=1y&interval=1wk`),
  ])

  const dayResult = parseChartResponse(dayData)
  const meta = dayResult.meta!

  // Compute 52-week high/low from actual historical closing prices
  const yearResult = parseChartResponse(yearData)
  const yearQuotes = yearResult.indicators?.quote?.[0] || {}
  const closes = (yearQuotes.close || []).filter((v): v is number => v != null && v > 0)
  const week52High = closes.length > 0 ? Math.max(...closes) : 0
  const week52Low = closes.length > 0 ? Math.min(...closes) : 0

  const info = SYMBOL_META[symbol] || { name: symbol, exchange: '', currency: 'USD', expenseRatio: 0 }

  return {
    symbol: symbol.replace('.L', '').replace('=F', ''),
    name: info.name,
    exchange: info.exchange,
    currency: info.currency,
    price: (meta.regularMarketPrice as number) || 0,
    previousClose:
      (meta.chartPreviousClose as number) ||
      (meta.previousClose as number) ||
      0,
    open: (meta.regularMarketOpen as number) || 0,
    dayHigh:
      (meta.regularMarketDayHigh as number) || (meta.dayHigh as number) || 0,
    dayLow:
      (meta.regularMarketDayLow as number) || (meta.dayLow as number) || 0,
    volume: (meta.regularMarketVolume as number) || 0,
    avgVolume: 55000,
    week52High,
    week52Low,
    marketCap: 0,
    nav: (meta.regularMarketPrice as number) || 0,
    expenseRatio: info.expenseRatio,
    timestamp: Date.now(),
  }
}

export async function fetchMultiSymbolData(
  symbols: string[]
): Promise<Record<string, MarketData>> {
  const results = await Promise.all(symbols.map(s => fetchMarketData(s)))
  const map: Record<string, MarketData> = {}
  symbols.forEach((s, i) => { map[s] = results[i] })
  return map
}

export async function fetchPriceHistory(
  symbol: string = 'VWRA.L',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo'
): Promise<PricePoint[]> {
  const intervalMap: Record<string, string> = {
    '1d': '5m',
    '5d': '15m',
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    '1y': '1wk',
  }

  const path = `${YAHOO_CHART_PATH}/${symbol}?range=${range}&interval=${intervalMap[range]}`
  const data = await fetchFromYahoo(path)
  const result = parseChartResponse(data)

  const timestamps = result.timestamp || []
  const quotes = result.indicators?.quote?.[0] || {}
  return timestamps.map((ts: number, i: number) => ({
    date: new Date(ts * 1000).toISOString(),
    open: quotes.open?.[i] || 0,
    high: quotes.high?.[i] || 0,
    low: quotes.low?.[i] || 0,
    close: quotes.close?.[i] || 0,
    volume: quotes.volume?.[i] || 0,
  }))
}

/**
 * Fetch historical daily data from a specific start date.
 * Uses period1/period2 for precise date control.
 * Caches in localStorage to avoid refetching.
 */
export async function fetchHistoricalData(
  symbol: string,
  startDate: Date = new Date('2026-03-01')
): Promise<PricePoint[]> {
  const cacheKey = `hist_${symbol}_${startDate.toISOString().split('T')[0]}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { ts: number; data: PricePoint[] }
      // Re-fetch if cache is older than 5 minutes
      if (Date.now() - parsed.ts < 5 * 60 * 1000) return parsed.data
    } catch { /* ignore bad cache */ }
  }

  const period1 = Math.floor(startDate.getTime() / 1000)
  const period2 = Math.floor(Date.now() / 1000)
  const path = `${YAHOO_CHART_PATH}/${symbol}?period1=${period1}&period2=${period2}&interval=1d`

  const data = await fetchFromYahoo(path)
  const result = parseChartResponse(data)

  const timestamps = result.timestamp || []
  const quotes = result.indicators?.quote?.[0] || {}
  const points: PricePoint[] = timestamps
    .map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString(),
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
    }))
    .filter(p => p.close > 0)

  localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: points }))
  return points
}
