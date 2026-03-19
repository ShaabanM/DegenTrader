import type { MarketData, PricePoint } from '../types/market'

/**
 * Market data service - fetches VWRA data from Yahoo Finance chart API
 * Uses the v8 chart endpoint which returns both metadata and price history
 */

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const VWRA_SYMBOL = 'VWRA.L'
const CORS_PROXY = 'https://corsproxy.io/?url='

async function fetchWithProxy(url: string): Promise<Response> {
  // Try direct first, fall back to CORS proxy
  try {
    const resp = await fetch(url)
    if (resp.ok) return resp
  } catch {
    // Direct failed, try proxy
  }
  const proxyResp = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`)
  if (!proxyResp.ok) throw new Error(`HTTP ${proxyResp.status}`)
  return proxyResp
}

function parseChartResponse(data: unknown) {
  const result = (data as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as {
    meta?: Record<string, unknown>
    timestamp?: number[]
    indicators?: { quote?: Record<string, (number | null)[]>[] }
  } | undefined
  if (!result?.meta) throw new Error('No data returned from Yahoo Finance')
  return result
}

export async function fetchMarketData(): Promise<MarketData> {
  const url = `${YAHOO_CHART}/${VWRA_SYMBOL}?range=1d&interval=5m`

  const resp = await fetchWithProxy(url)
  const data = await resp.json()
  const result = parseChartResponse(data)
  const meta = result.meta!

  return {
    symbol: 'VWRA',
    name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
    exchange: 'LSE',
    currency: 'USD',
    price: meta.regularMarketPrice as number || 0,
    previousClose: meta.chartPreviousClose as number || meta.previousClose as number || 0,
    open: meta.regularMarketOpen as number || 0,
    dayHigh: meta.regularMarketDayHigh as number || meta.dayHigh as number || 0,
    dayLow: meta.regularMarketDayLow as number || meta.dayLow as number || 0,
    volume: meta.regularMarketVolume as number || 0,
    avgVolume: 55000,
    week52High: meta.fiftyTwoWeekHigh as number || 0,
    week52Low: meta.fiftyTwoWeekLow as number || 0,
    marketCap: 0,
    nav: meta.regularMarketPrice as number || 0,
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

  const url = `${YAHOO_CHART}/${VWRA_SYMBOL}?range=${range}&interval=${intervalMap[range]}`

  const resp = await fetchWithProxy(url)
  const data = await resp.json()
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
