import type { MarketData, PricePoint } from '../types/market'

/**
 * Market data service - fetches VWRA data from Yahoo Finance API
 * Yahoo Finance uses VWRA.L for London Stock Exchange listing
 *
 * Future: This service will be extended with:
 * - WebSocket real-time feeds
 * - News/sentiment API integration
 * - Algo signal computation
 */

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance'
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
  return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`)
}

export async function fetchMarketData(): Promise<MarketData> {
  const url = `${YAHOO_BASE}/finance/quote?symbols=${VWRA_SYMBOL}`

  try {
    const resp = await fetchWithProxy(url)
    const data = await resp.json()
    const quote = data?.quoteResponse?.result?.[0]

    if (!quote) throw new Error('No data returned')

    return {
      symbol: 'VWRA',
      name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
      exchange: 'LSE',
      currency: 'USD',
      price: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      open: quote.regularMarketOpen || 0,
      dayHigh: quote.regularMarketDayHigh || 0,
      dayLow: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageDailyVolume3Month || 0,
      week52High: quote.fiftyTwoWeekHigh || 0,
      week52Low: quote.fiftyTwoWeekLow || 0,
      marketCap: quote.marketCap || 0,
      nav: quote.navPrice || quote.regularMarketPrice || 0,
      expenseRatio: 0.0019, // VWRA TER is 0.19%
      timestamp: Date.now(),
    }
  } catch (err) {
    throw new Error('Unable to fetch market data. Yahoo Finance API may be unavailable.')
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

  const url = `${YAHOO_BASE}/finance/chart/${VWRA_SYMBOL}?range=${range}&interval=${intervalMap[range]}`

  try {
    const resp = await fetchWithProxy(url)
    const data = await resp.json()
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error('No chart data')

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
  } catch (err) {
    throw new Error('Unable to fetch price history.')
  }
}

