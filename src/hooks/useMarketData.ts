import { useState, useEffect, useCallback } from 'react'
import type { MarketData, PricePoint } from '../types/market'
import { fetchMarketData, fetchPriceHistory } from '../services/marketData'

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

export function usePriceHistory(range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo') {
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPriceHistory(range)
      .then(setHistory)
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
        setHistory([])
      })
      .finally(() => setLoading(false))
  }, [range])

  return { history, loading, error }
}
