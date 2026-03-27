import { useMemo } from 'react'
import type { MarketData, PricePoint, AlgoSignal, BacktestResult } from '../types/market'
import { algorithms } from '../algos/registry'
import { runAllBacktests } from '../services/backtester'

export function useAlgoSignals(
  vwraData: MarketData | undefined,
  oilData: MarketData | undefined,
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[]
): AlgoSignal[] {
  return useMemo(() => {
    if (!vwraData || !oilData || vwraHistory.length < 5 || oilHistory.length < 5) {
      return algorithms.map(algo => ({
        id: algo.id,
        name: algo.name,
        action: 'FLAT' as const,
        confidence: 0,
        reasoning: 'Waiting for data...',
        timestamp: Date.now(),
      }))
    }

    return algorithms.map(algo => {
      const output = algo.compute({
        vwraPrices: vwraHistory,
        oilPrices: oilHistory,
        currentVwra: vwraData.price,
        currentOil: oilData.price,
      })

      return {
        id: algo.id,
        name: algo.name,
        action: output.action,
        confidence: output.confidence,
        reasoning: output.reasoning,
        entryPrice: output.entryPrice,
        exitPrice: output.exitPrice,
        timestamp: Date.now(),
      }
    })
  }, [vwraData, oilData, vwraHistory, oilHistory])
}

export function useBacktests(
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[]
): BacktestResult[] {
  return useMemo(() => {
    if (vwraHistory.length < 10 || oilHistory.length < 10) return []
    return runAllBacktests(algorithms, vwraHistory, oilHistory)
  }, [vwraHistory, oilHistory])
}
