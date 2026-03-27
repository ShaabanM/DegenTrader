import { useState, useEffect, useCallback } from 'react'
import type { MarketData, PricePoint } from '../types/market'
import { fetchMarketData, fetchMultiSymbolData, fetchPriceHistory, fetchHistoricalData } from '../services/marketData'

export function useMarketData(refreshInterval: number = 30000) {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const marketData = await fetchMarketData()
      setData(marketData)
      setLastRefresh(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  return { data, loading, error, lastRefresh, refresh }
}

export function useMultiMarketData(
  symbols: string[] = ['VWRA.L', 'BZ=F'],
  refreshInterval: number = 30000
) {
  const [data, setData] = useState<Record<string, MarketData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const result = await fetchMultiSymbolData(symbols)
      setData(result)
      setLastRefresh(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(',')])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  return { data, loading, error, lastRefresh, refresh }
}

export function usePriceHistory(
  symbol: string = 'VWRA.L',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo'
) {
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPriceHistory(symbol, range)
      .then(setHistory)
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
        setHistory([])
      })
      .finally(() => setLoading(false))
  }, [symbol, range])

  return { history, loading, error }
}

export function useHistoricalData(
  symbols: string[] = ['VWRA.L', 'BZ=F'],
  startDate: Date = new Date('2026-03-01')
) {
  const [data, setData] = useState<Record<string, PricePoint[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all(symbols.map(s => fetchHistoricalData(s, startDate)))
      .then(results => {
        const map: Record<string, PricePoint[]> = {}
        symbols.forEach((s, i) => { map[s] = results[i] })
        setData(map)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to fetch historical data')
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), startDate.getTime()])

  return { data, loading, error }
}
