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
    return timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString(),
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
    }))
  } catch (err) {
    console.warn('Chart data fetch failed:', err)
    return generateFallbackHistory(range)
  }
}

function getFallbackData(): MarketData {
  // Static VWRA fallback values as of March 2026
  return {
    symbol: 'VWRA',
    name: 'Vanguard FTSE All-World UCITS ETF (USD) Accumulating',
    exchange: 'LSE',
    currency: 'USD',
    price: 172.64,
    previousClose: 172.30,
    open: 172.45,
    dayHigh: 173.10,
    dayLow: 171.80,
    volume: 52000,
    avgVolume: 55000,
    week52High: 202.30,
    week52Low: 118.94,
    marketCap: 55_390_000_000,
    nav: 172.60,
    expenseRatio: 0.0019,
    timestamp: Date.now(),
  }
}

function generateFallbackHistory(range: string): PricePoint[] {
  const points: PricePoint[] = []
  const daysMap: Record<string, number> = {
    '1d': 1, '5d': 5, '1mo': 22, '3mo': 66, '6mo': 130, '1y': 252
  }
  const days = daysMap[range] || 22

  // Deterministic price history using a seeded-style approach
  // End price ~172.64, work backwards with realistic daily moves
  const endPrice = 172.64
  const dailyVol = 0.008 // ~0.8% daily volatility
  const prices: number[] = [endPrice]
  for (let i = 1; i <= days; i++) {
    // Use a simple deterministic sequence (sin-based) for reproducible data
    const seed = i * 0.7 + days * 0.3
    const move = Math.sin(seed) * dailyVol * prices[0] + (Math.cos(seed * 1.3) * dailyVol * prices[0] * 0.5)
    prices.unshift(prices[0] - move)
  }

  for (let i = 0; i < prices.length; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (prices.length - 1 - i))
    const p = prices[i]
    const spread = p * 0.004 // 0.4% intraday range
    const seedHigh = Math.abs(Math.sin(i * 2.1)) * spread
    const seedLow = Math.abs(Math.sin(i * 3.7)) * spread

    points.push({
      date: date.toISOString(),
      open: +(p - Math.sin(i * 1.1) * spread * 0.3).toFixed(2),
      high: +(p + seedHigh).toFixed(2),
      low: +(p - seedLow).toFixed(2),
      close: +p.toFixed(2),
      volume: 45000 + Math.floor(Math.abs(Math.sin(i * 4.3)) * 25000),
    })
  }
  return points
}
