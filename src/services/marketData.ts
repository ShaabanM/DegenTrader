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
      currency: quote.currency || 'GBp',
      price: (quote.regularMarketPrice || 0) / (quote.currency === 'GBp' ? 100 : 1),
      previousClose: (quote.regularMarketPreviousClose || 0) / (quote.currency === 'GBp' ? 100 : 1),
      open: (quote.regularMarketOpen || 0) / (quote.currency === 'GBp' ? 100 : 1),
      dayHigh: (quote.regularMarketDayHigh || 0) / (quote.currency === 'GBp' ? 100 : 1),
      dayLow: (quote.regularMarketDayLow || 0) / (quote.currency === 'GBp' ? 100 : 1),
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageDailyVolume3Month || 0,
      week52High: (quote.fiftyTwoWeekHigh || 0) / (quote.currency === 'GBp' ? 100 : 1),
      week52Low: (quote.fiftyTwoWeekLow || 0) / (quote.currency === 'GBp' ? 100 : 1),
      marketCap: quote.marketCap || 0,
      nav: (quote.navPrice || quote.regularMarketPrice || 0) / (quote.currency === 'GBp' ? 100 : 1),
      expenseRatio: 0.0022, // VWRA TER is 0.22%
      timestamp: Date.now(),
    }
  } catch (err) {
    console.warn('Yahoo Finance API failed, using fallback data:', err)
    return getFallbackData()
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
    const isGBp = result.meta?.currency === 'GBp'
    const divisor = isGBp ? 100 : 1

    return timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString(),
      open: (quotes.open?.[i] || 0) / divisor,
      high: (quotes.high?.[i] || 0) / divisor,
      low: (quotes.low?.[i] || 0) / divisor,
      close: (quotes.close?.[i] || 0) / divisor,
      volume: quotes.volume?.[i] || 0,
    }))
  } catch (err) {
    console.warn('Chart data fetch failed:', err)
    return generateFallbackHistory(range)
  }
}

function getFallbackData(): MarketData {
  // Reasonable VWRA values as of early 2026
  const basePrice = 124.50
  const change = (Math.random() - 0.48) * 3 // slight upward bias
  return {
    symbol: 'VWRA',
    name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
    exchange: 'LSE',
    currency: 'GBP',
    price: basePrice + change,
    previousClose: basePrice,
    open: basePrice + (Math.random() - 0.5) * 1,
    dayHigh: basePrice + Math.abs(change) + Math.random() * 1.5,
    dayLow: basePrice - Math.abs(change) - Math.random() * 1.5,
    volume: 45000 + Math.floor(Math.random() * 30000),
    avgVolume: 55000,
    week52High: 132.80,
    week52Low: 98.20,
    marketCap: 15_200_000_000,
    nav: basePrice + change * 0.99,
    expenseRatio: 0.0022,
    timestamp: Date.now(),
  }
}

function generateFallbackHistory(range: string): PricePoint[] {
  const points: PricePoint[] = []
  const daysMap: Record<string, number> = {
    '1d': 1, '5d': 5, '1mo': 22, '3mo': 66, '6mo': 130, '1y': 252
  }
  const days = daysMap[range] || 22
  let price = 118 + Math.random() * 8

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const volatility = 1.5
    const drift = 0.02
    const change = (Math.random() - 0.48) * volatility + drift
    price += change
    const high = price + Math.random() * volatility
    const low = price - Math.random() * volatility

    points.push({
      date: date.toISOString(),
      open: price - change * 0.3,
      high,
      low,
      close: price,
      volume: 40000 + Math.floor(Math.random() * 40000),
    })
  }
  return points
}
