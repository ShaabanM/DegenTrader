import type { MarketData, PricePoint } from '../types/market'

/**
 * Market data service - fetches VWRA data from Yahoo Finance chart API.
 *
 * Data flow:
 *   Development: Vite dev proxy (/api/yahoo -> query2.finance.yahoo.com)
 *   Production:  CF Worker proxy -> allorigins fallback
 */

const YAHOO_CHART_PATH = '/v8/finance/chart'
const VWRA_SYMBOL = 'VWRA.L'

const isDev = import.meta.env.DEV

// CF Worker URL - set via VITE_API_WORKER_URL env var at build time
const CF_WORKER_URL = import.meta.env.VITE_API_WORKER_URL as string | undefined

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

export async function fetchMarketData(): Promise<MarketData> {
  const path = `${YAHOO_CHART_PATH}/${VWRA_SYMBOL}?range=1d&interval=5m`
  const data = await fetchFromYahoo(path)
  const result = parseChartResponse(data)
  const meta = result.meta!

  return {
    symbol: 'VWRA',
    name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
    exchange: 'LSE',
    currency: 'USD',
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
    week52High: (meta.fiftyTwoWeekHigh as number) || 0,
    week52Low: (meta.fiftyTwoWeekLow as number) || 0,
    marketCap: 0,
    nav: (meta.regularMarketPrice as number) || 0,
    expenseRatio: 0.0019,
    timestamp: Date.now(),
  }
}

export async function fetchPriceHistory(
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

  const path = `${YAHOO_CHART_PATH}/${VWRA_SYMBOL}?range=${range}&interval=${intervalMap[range]}`
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
