import type { Algorithm, BacktestResult, BacktestTrade, EquityPoint, PricePoint } from '../types/market'
import { calculateTradeFees } from '../utils/fees'
import { maxDrawdown, returns, sharpeRatio } from '../algos/utils'

function buyHoldReturn(vwraHistory: PricePoint[], startingCapital: number): { returnPct: number; curve: EquityPoint[] } {
  if (vwraHistory.length < 2) {
    return { returnPct: 0, curve: [] }
  }

  const entryPrice = vwraHistory[0].open || vwraHistory[0].close
  const shares = affordableShares(startingCapital, entryPrice)
  const entryValue = shares * entryPrice
  const buyFees = calculateTradeFees(entryValue)
  const startingCash = startingCapital - entryValue - buyFees.totalFees

  let endingCash = startingCash
  const curve = vwraHistory.map((bar, index) => {
    const isLast = index === vwraHistory.length - 1
    const markToMarket = shares * bar.close

    if (isLast) {
      const sellFees = calculateTradeFees(markToMarket)
      endingCash = startingCash + markToMarket - sellFees.totalFees
    }

    return {
      date: bar.date,
      equity: isLast ? endingCash : startingCash + markToMarket,
    }
  })

  return {
    returnPct: ((endingCash - startingCapital) / startingCapital) * 100,
    curve,
  }
}

function affordableShares(capital: number, price: number): number {
  let shares = Math.floor(capital / price)
  while (shares > 0) {
    const entryValue = shares * price
    const fees = calculateTradeFees(entryValue)
    if (entryValue + fees.totalFees <= capital) return shares
    shares -= 1
  }
  return 0
}

export function runBacktest(
  algo: Algorithm,
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
  startingCapital: number = 10000,
): BacktestResult {
  const rawTrades = algo.backtest({
    vwraPrices: vwraHistory,
    oilPrices: oilHistory,
    currentVwra: vwraHistory[vwraHistory.length - 1]?.close || 0,
    currentOil: oilHistory[oilHistory.length - 1]?.close || 0,
  })

  const tradeQueue = [...rawTrades]
  let currentTrade = tradeQueue.shift()
  let activeTrade: BacktestTrade | null = null
  let cash = startingCapital
  let shares = 0
  const realizedTrades: BacktestTrade[] = []
  const equityCurve: EquityPoint[] = []

  for (const bar of vwraHistory) {
    if (currentTrade && bar.date === currentTrade.entryDate && activeTrade === null) {
      shares = affordableShares(cash, currentTrade.entryPrice)
      if (shares > 0) {
        const entryValue = shares * currentTrade.entryPrice
        const buyFees = calculateTradeFees(entryValue)
        cash -= entryValue + buyFees.totalFees
        activeTrade = {
          ...currentTrade,
          shares,
        }
      }
    }

    if (activeTrade && bar.date === activeTrade.exitDate) {
      const exitValue = shares * activeTrade.exitPrice
      const sellFees = calculateTradeFees(exitValue)
      const grossEntryValue = shares * activeTrade.entryPrice
      const grossPnl = exitValue - grossEntryValue
      const buyFees = calculateTradeFees(grossEntryValue)
      const actualPnl = grossPnl - buyFees.totalFees - sellFees.totalFees
      cash += exitValue - sellFees.totalFees

      realizedTrades.push({
        ...activeTrade,
        pnl: actualPnl,
        pnlPct: grossEntryValue > 0 ? (actualPnl / grossEntryValue) * 100 : 0,
      })

      shares = 0
      activeTrade = null
      currentTrade = tradeQueue.shift()
    }

    const equity = cash + shares * bar.close
    equityCurve.push({
      date: bar.date,
      equity,
    })
  }

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? startingCapital
  const totalReturn = finalEquity - startingCapital
  const wins = realizedTrades.filter(trade => trade.pnl > 0).length
  const equityValues = equityCurve.map(point => point.equity)
  const benchmark = buyHoldReturn(vwraHistory, startingCapital)
  const benchmarkByDate = new Map(benchmark.curve.map(point => [point.date, point.equity]))
  const combinedCurve = equityCurve.map(point => ({
    ...point,
    benchmark: benchmarkByDate.get(point.date) ?? benchmark.curve[benchmark.curve.length - 1]?.equity ?? startingCapital,
  }))
  const periodReturns = returns(equityValues).slice(1)
  const barsInTrades = realizedTrades.reduce((sum, trade) => sum + (trade.barsHeld ?? 0), 0)

  return {
    algoId: algo.id,
    algoName: algo.name,
    description: algo.description,
    horizon: algo.horizon,
    trades: realizedTrades,
    totalReturn,
    totalReturnPct: (totalReturn / startingCapital) * 100,
    benchmarkReturnPct: benchmark.returnPct,
    alphaPct: (totalReturn / startingCapital) * 100 - benchmark.returnPct,
    winRate: realizedTrades.length > 0 ? (wins / realizedTrades.length) * 100 : 0,
    maxDrawdown: maxDrawdown(equityValues) * 100,
    sharpeRatio: sharpeRatio(periodReturns),
    exposurePct: vwraHistory.length > 0 ? (barsInTrades / vwraHistory.length) * 100 : 0,
    avgHoldBars: realizedTrades.length > 0 ? barsInTrades / realizedTrades.length : 0,
    startingCapital,
    finalEquity,
    equityCurve: combinedCurve,
  }
}

export function runAllBacktests(
  algorithms: Algorithm[],
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
  startingCapital: number = 10000,
): BacktestResult[] {
  return algorithms
    .map(algo => runBacktest(algo, vwraHistory, oilHistory, startingCapital))
    .sort((left, right) => right.alphaPct - left.alphaPct)
}
