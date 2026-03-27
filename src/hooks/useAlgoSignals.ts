import { useMemo } from 'react'
import type { AlgoSignal, BacktestResult, MarketData, PricePoint } from '../types/market'
import { algorithms } from '../algos/registry'
import { runAllBacktests } from '../services/backtester'

export function useAlgoSignals(
  vwraData: MarketData | undefined,
  oilData: MarketData | undefined,
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
): AlgoSignal[] {
  return useMemo(() => {
    if (!vwraData || !oilData || vwraHistory.length < 30 || oilHistory.length < 30) {
      return algorithms.map(algo => ({
        id: algo.id,
        name: algo.name,
        description: algo.description,
        category: algo.category,
        horizon: algo.horizon,
        action: 'FLAT' as const,
        confidence: 0,
        reasoning: 'Loading aligned intraday bars...',
        reasons: [],
        metrics: [],
        timestamp: vwraData?.timestamp ?? oilData?.timestamp ?? 0,
      }))
    }

    return algorithms.map(algo => {
      const output = algo.compute({
        vwraPrices: vwraHistory,
        oilPrices: oilHistory,
        currentVwra: vwraData.price,
        currentOil: oilData.price,
        liveVwra: vwraData,
        liveOil: oilData,
      })

      return {
        id: algo.id,
        name: algo.name,
        description: algo.description,
        category: algo.category,
        horizon: algo.horizon,
        action: output.action,
        confidence: output.confidence,
        reasoning: output.reasoning,
        reasons: output.reasons ?? [],
        metrics: output.metrics ?? [],
        entryPrice: output.entryPrice,
        exitPrice: output.exitPrice,
        timestamp: vwraData.timestamp || oilData.timestamp,
      }
    })
  }, [vwraData, oilData, vwraHistory, oilHistory])
}

export function useBacktests(
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
  startingCapital: number = 10000,
): BacktestResult[] {
  return useMemo(() => {
    if (vwraHistory.length < 40 || oilHistory.length < 40) return []
    return runAllBacktests(algorithms, vwraHistory, oilHistory, startingCapital)
  }, [vwraHistory, oilHistory, startingCapital])
}
