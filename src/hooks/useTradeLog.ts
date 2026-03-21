import { useState, useCallback } from 'react'
import type { LoggedTrade } from '../types/market'

const STORAGE_KEY = 'degentrader-trades'

function loadTrades(): LoggedTrade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTrades(trades: LoggedTrade[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
}

export function useTradeLog() {
  const [trades, setTrades] = useState<LoggedTrade[]>(loadTrades)

  const addTrade = useCallback((trade: Omit<LoggedTrade, 'id' | 'timestamp'>) => {
    setTrades(prev => {
      const next = [...prev, { ...trade, id: crypto.randomUUID(), timestamp: Date.now() }]
      saveTrades(next)
      return next
    })
  }, [])

  const removeTrade = useCallback((id: string) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== id)
      saveTrades(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setTrades([])
    saveTrades([])
  }, [])

  return { trades, addTrade, removeTrade, clearAll }
}
