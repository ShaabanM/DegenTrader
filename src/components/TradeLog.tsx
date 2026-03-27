import { useMemo, useState } from 'react'
import type { LoggedTrade } from '../types/market'
import { calculateTradeFees } from '../utils/fees'
import { formatCurrency, formatPercent } from '../utils/format'

interface TradeLogProps {
  trades: LoggedTrade[]
  currentPrice: number
  onAdd: (trade: Omit<LoggedTrade, 'id' | 'timestamp'>) => void
  onRemove: (id: string) => void
  onClearAll: () => void
}

export function TradeLog({ trades, currentPrice, onAdd, onRemove, onClearAll }: TradeLogProps) {
  const [shares, setShares] = useState(30)
  const [buyPriceOverride, setBuyPriceOverride] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const buyPrice = buyPriceOverride ?? currentPrice

  const portfolio = useMemo(() => {
    if (trades.length === 0) return null

    const totalShares = trades.reduce((sum, trade) => sum + trade.shares, 0)
    const grossCost = trades.reduce((sum, trade) => sum + trade.shares * trade.buyPrice, 0)
    const totalCost = trades.reduce((sum, trade) => sum + trade.totalCost, 0)
    const currentValue = totalShares * currentPrice
    const sellFees = calculateTradeFees(currentValue)
    const netPnl = currentValue - totalCost - sellFees.totalFees
    const returnPct = grossCost > 0 ? (netPnl / grossCost) * 100 : 0

    return {
      totalShares,
      totalCost,
      currentValue,
      netPnl,
      returnPct,
      averageBuy: totalShares > 0 ? grossCost / totalShares : 0,
      sellFees: sellFees.totalFees,
    }
  }, [currentPrice, trades])

  function handleAdd() {
    const gross = shares * buyPrice
    const fees = calculateTradeFees(gross)
    onAdd({
      shares,
      buyPrice,
      totalCost: gross + fees.totalFees,
      buyFees: fees.totalFees,
      note,
    })
    setNote('')
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Trade journal</span>
          <h2>Your actual VWRA entries</h2>
        </div>
        {trades.length > 1 && (
          <button className="ghost-btn" onClick={onClearAll}>Clear all</button>
        )}
      </div>

      <div className="trade-tab-grid compact">
        <div className="form-stack">
          <label className="field">
            <span>Shares</span>
            <input type="number" min={1} step={1} value={shares} onChange={event => setShares(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Buy price</span>
            <input type="number" min={0} step={0.01} value={buyPrice} onChange={event => setBuyPriceOverride(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Note</span>
            <input type="text" value={note} onChange={event => setNote(event.target.value)} placeholder="Train trade, dip buy, panic exit..." />
          </label>
          <button className="primary-btn" onClick={handleAdd}>Add trade</button>
        </div>

        <div className="planner-summary">
          {portfolio ? (
            <>
              <div className="planner-hero">
                <span>Live P&L</span>
                <strong className={portfolio.netPnl >= 0 ? 'positive' : 'negative'}>{formatCurrency(portfolio.netPnl)}</strong>
                <small className={portfolio.netPnl >= 0 ? 'positive' : 'negative'}>{formatPercent(portfolio.returnPct)}</small>
              </div>
              <div className="planner-list">
                <div><span>Shares held</span><strong>{portfolio.totalShares}</strong></div>
                <div><span>Avg buy</span><strong>{formatCurrency(portfolio.averageBuy)}</strong></div>
                <div><span>Current value</span><strong>{formatCurrency(portfolio.currentValue)}</strong></div>
                <div><span>Estimated sell fees</span><strong className="negative">{formatCurrency(-portfolio.sellFees)}</strong></div>
              </div>
            </>
          ) : (
            <div className="chart-empty">Add your real entries here so the app can tell you what the position is worth now.</div>
          )}
        </div>
      </div>

      {trades.length > 0 && (
        <div className="trade-tape">
          <div className="trade-tape-head">
            <span>Logged entries</span>
            <span>Current VWRA {formatCurrency(currentPrice)}</span>
          </div>
          {trades.slice().reverse().map(trade => {
            const liveValue = trade.shares * currentPrice
            const sellFees = calculateTradeFees(liveValue)
            const pnl = liveValue - trade.totalCost - sellFees.totalFees

            return (
              <div key={trade.id} className="trade-tape-row">
                <span>{new Date(trade.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                <span>{trade.shares} sh @ {formatCurrency(trade.buyPrice)}</span>
                <span className={pnl >= 0 ? 'positive' : 'negative'}>{formatCurrency(pnl)}</span>
                <button className="ghost-btn" onClick={() => onRemove(trade.id)}>Remove</button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
