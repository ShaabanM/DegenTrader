import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MarketData, PricePoint } from '../types/market'
import { fetchHistoricalData, fetchMarketData, fetchMultiSymbolData, fetchPriceHistory } from '../services/marketData'

export function useMarketData(refreshInterval: number = 30000) {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const marketData = await fetchMarketData()
      setData(marketData)
      setLastRefresh(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), refreshInterval)
    return () => window.clearInterval(interval)
  }, [refresh, refreshInterval])

  return { data, loading, error, lastRefresh, refresh }
}

export function useMultiMarketData(
  symbols: string[] = ['VWRA.L', 'BZ=F'],
  refreshInterval: number = 30000,
) {
  const stableKey = useMemo(() => symbols.join(','), [symbols])
  const stableSymbols = useMemo(() => stableKey.split(','), [stableKey])
  const [data, setData] = useState<Record<string, MarketData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchMultiSymbolData(stableSymbols)
      setData(result)
      setLastRefresh(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data')
    } finally {
      setLoading(false)
    }
  }, [stableSymbols])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), refreshInterval)
    return () => window.clearInterval(interval)
  }, [refresh, refreshInterval])

  return { data, loading, error, lastRefresh, refresh }
}

export function usePriceHistory(
  symbol: string = 'VWRA.L',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo',
) {
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)

      try {
        const points = await fetchPriceHistory(symbol, range)
        if (!cancelled) setHistory(points)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch chart history')
          setHistory([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [symbol, range])

  return { history, loading, error }
}

export function useHistoricalData(
  symbols: string[] = ['VWRA.L', 'BZ=F'],
  startDate: Date = new Date('2026-03-01T00:00:00Z'),
  interval: '30m' | '60m' | '1d' = '30m',
) {
  const stableKey = useMemo(() => `${symbols.join(',')}:${startDate.toISOString()}:${interval}`, [symbols, startDate, interval])
  const [symbolKey] = stableKey.split(':')
  const stableSymbols = useMemo(() => symbolKey.split(','), [symbolKey])
  const [data, setData] = useState<Record<string, PricePoint[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)

      try {
        const result = await Promise.all(stableSymbols.map(symbol => fetchHistoricalData(symbol, startDate, interval)))
        if (!cancelled) {
          setData(Object.fromEntries(stableSymbols.map((symbol, index) => [symbol, result[index]])))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch historical data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [stableKey, stableSymbols, startDate, interval])

  return { data, loading, error }
}
