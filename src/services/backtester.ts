import type { Algorithm, AlgoInput, BacktestResult, PricePoint } from '../types/market'
import { calculateTradeFees } from '../utils/fees'
import { returns, maxDrawdown, sharpeRatio } from '../algos/utils'

/**
 * Run a backtest for a given algorithm on historical data.
 * Simulates trades with IBKR fees deducted.
 */
export function runBacktest(
  algo: Algorithm,
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
  startingCapital: number = 10000
): BacktestResult {
  const input: AlgoInput = {
    vwraPrices: vwraHistory,
    oilPrices: oilHistory,
    currentVwra: vwraHistory[vwraHistory.length - 1]?.close || 0,
    currentOil: oilHistory[oilHistory.length - 1]?.close || 0,
  }

  const rawTrades = algo.backtest(input)

  // Apply IBKR fees to each trade and compute actual P&L
  let equity = startingCapital
  const equityCurve: { date: string; equity: number }[] = [
    { date: vwraHistory[0]?.date || '', equity: startingCapital }
  ]

  const feeTrades = rawTrades.map(trade => {
    const tradeValue = equity // invest full capital each trade
    const shares = Math.floor(tradeValue / trade.entryPrice)
    if (shares <= 0) return { ...trade, pnl: 0, pnlPct: 0 }

    const entryValue = shares * trade.entryPrice
    const exitValue = shares * trade.exitPrice

    const buyFees = calculateTradeFees(entryValue)
    const sellFees = calculateTradeFees(exitValue)

    let grossPnl: number
    if (trade.action === 'BUY') {
      grossPnl = exitValue - entryValue
    } else {
      // Short: profit when price goes down
      grossPnl = entryValue - exitValue
    }

    const netPnl = grossPnl - buyFees.totalFees - sellFees.totalFees
    equity += netPnl

    equityCurve.push({ date: trade.exitDate, equity })

    return {
      ...trade,
      pnl: netPnl,
      pnlPct: entryValue > 0 ? (netPnl / entryValue) * 100 : 0,
    }
  })

  const wins = feeTrades.filter(t => t.pnl > 0).length
  const totalReturn = equity - startingCapital
  const equityValues = equityCurve.map(e => e.equity)
  const dailyReturns = returns(equityValues).slice(1)

  return {
    algoId: algo.id,
    algoName: algo.name,
    trades: feeTrades,
    totalReturn,
    totalReturnPct: (totalReturn / startingCapital) * 100,
    winRate: feeTrades.length > 0 ? (wins / feeTrades.length) * 100 : 0,
    maxDrawdown: maxDrawdown(equityValues) * 100,
    sharpeRatio: sharpeRatio(dailyReturns),
    equityCurve,
  }
}

/**
 * Run backtests for all algorithms and return results.
 */
export function runAllBacktests(
  algorithms: Algorithm[],
  vwraHistory: PricePoint[],
  oilHistory: PricePoint[],
  startingCapital: number = 10000
): BacktestResult[] {
  return algorithms.map(algo => runBacktest(algo, vwraHistory, oilHistory, startingCapital))
}
