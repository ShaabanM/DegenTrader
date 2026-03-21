import { useState, useMemo } from 'react'
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
  const [buyPrice, setBuyPrice] = useState(currentPrice || 165)
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (!initialized && currentPrice > 0) {
    setBuyPrice(Math.round(currentPrice * 100) / 100)
    setInitialized(true)
  }

  const handleAdd = () => {
    const cost = shares * buyPrice
    const buyFees = calculateTradeFees(cost)
    onAdd({
      shares,
      buyPrice,
      totalCost: cost + buyFees.totalFees,
      buyFees: buyFees.totalFees,
      note,
    })
    setNote('')
    setShowForm(false)
  }

  // Aggregate portfolio stats
  const portfolio = useMemo(() => {
    if (trades.length === 0) return null

    const totalShares = trades.reduce((s, t) => s + t.shares, 0)
    const totalCost = trades.reduce((s, t) => s + t.totalCost, 0)
    const totalBuyFees = trades.reduce((s, t) => s + t.buyFees, 0)
    const avgBuyPrice = totalShares > 0
      ? trades.reduce((s, t) => s + t.shares * t.buyPrice, 0) / totalShares
      : 0

    const currentValue = totalShares * currentPrice
    const sellFees = calculateTradeFees(currentValue)
    const grossPnl = currentValue - trades.reduce((s, t) => s + t.shares * t.buyPrice, 0)
    const roundTripFees = totalBuyFees + sellFees.totalFees
    const netPnl = grossPnl - roundTripFees

    // Break-even sell price (round up to $0.10)
    let breakEvenPrice = 0
    if (totalShares > 0) {
      breakEvenPrice = totalCost / totalShares
      for (let i = 0; i < 20; i++) {
        const beSellValue = breakEvenPrice * totalShares
        const beSellFees = calculateTradeFees(beSellValue)
        breakEvenPrice = (totalCost + beSellFees.totalFees) / totalShares
      }
      breakEvenPrice = Math.ceil(breakEvenPrice * 10) / 10
    }

    const returnPct = totalCost > 0 ? (netPnl / (totalCost - totalBuyFees)) * 100 : 0

    return {
      totalShares,
      totalCost,
      totalBuyFees,
      avgBuyPrice,
      currentValue,
      sellFees: sellFees.totalFees,
      roundTripFees,
      grossPnl,
      netPnl,
      returnPct,
      breakEvenPrice,
    }
  }, [trades, currentPrice])

  return (
    <div className="card trade-log-card">
      <h3 className="card-title">
        Trade Log
        <span className="subtitle">
          {trades.length} trade{trades.length !== 1 ? 's' : ''} logged
        </span>
      </h3>

      {/* Portfolio Summary */}
      {portfolio && (
        <div className="portfolio-summary">
          <div className="portfolio-hero">
            <div className="portfolio-stat-block">
              <span className="portfolio-label">Position Value</span>
              <span className="portfolio-value">{formatCurrency(portfolio.currentValue)}</span>
            </div>
            <div className="portfolio-stat-block">
              <span className="portfolio-label">Net P&L (if sold now)</span>
              <span className={`portfolio-value ${portfolio.netPnl >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(portfolio.netPnl)}
              </span>
              <span className={`portfolio-pct ${portfolio.netPnl >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(portfolio.returnPct)}
              </span>
            </div>
          </div>

          <div className="portfolio-details">
            <div className="detail-row">
              <span>Total shares</span>
              <span className="mono">{portfolio.totalShares}</span>
            </div>
            <div className="detail-row">
              <span>Avg buy price</span>
              <span className="mono">{formatCurrency(portfolio.avgBuyPrice)}</span>
            </div>
            <div className="detail-row">
              <span>Total invested (incl. buy fees)</span>
              <span className="mono">{formatCurrency(portfolio.totalCost)}</span>
            </div>
            <div className="detail-row separator">
              <span>Gross P&L</span>
              <span className={`mono ${portfolio.grossPnl >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(portfolio.grossPnl)}
              </span>
            </div>
            <div className="fee-breakdown">
              <div className="detail-row fee">
                <span>Buy fees (paid)</span>
                <span className="mono negative">-{formatCurrency(portfolio.totalBuyFees)}</span>
              </div>
              <div className="detail-row fee">
                <span>Sell fees (estimated)</span>
                <span className="mono negative">-{formatCurrency(portfolio.sellFees)}</span>
              </div>
              <div className="detail-row total-fees">
                <span>Round-trip fees</span>
                <span className="mono negative">-{formatCurrency(portfolio.roundTripFees)}</span>
              </div>
            </div>
            <div className="detail-row highlight">
              <span>Break-even sell price</span>
              <span className="mono">{formatCurrency(portfolio.breakEvenPrice)}</span>
            </div>
            <div className="detail-row">
              <span>Current price</span>
              <span className="mono">{formatCurrency(currentPrice)}</span>
            </div>
            <div className="detail-row">
              <span>Distance to break-even</span>
              <span className={`mono ${currentPrice >= portfolio.breakEvenPrice ? 'positive' : 'negative'}`}>
                {formatCurrency(currentPrice - portfolio.breakEvenPrice)}
                {' '}({formatPercent(((currentPrice - portfolio.breakEvenPrice) / portfolio.breakEvenPrice) * 100)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trade list */}
      {trades.length > 0 && (
        <div className="trade-list">
          <div className="trade-list-header">
            <span>Date</span>
            <span>Shares</span>
            <span>Buy Price</span>
            <span>Cost</span>
            <span>P&L Now</span>
            <span></span>
          </div>
          {trades.map(trade => {
            const currentVal = trade.shares * currentPrice
            const sellFees = calculateTradeFees(currentVal)
            const pnl = currentVal - trade.totalCost - sellFees.totalFees
            return (
              <div key={trade.id} className="trade-row">
                <span className="mono trade-date">
                  {new Date(trade.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <span className="mono">{trade.shares}</span>
                <span className="mono">{formatCurrency(trade.buyPrice)}</span>
                <span className="mono">{formatCurrency(trade.totalCost)}</span>
                <span className={`mono ${pnl >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(pnl)}
                </span>
                <button className="remove-trade" onClick={() => onRemove(trade.id)} title="Remove trade">
                  &times;
                </button>
              </div>
            )
          })}
          {trades.length > 1 && (
            <button className="clear-all-btn" onClick={onClearAll}>
              Clear all trades
            </button>
          )}
        </div>
      )}

      {/* Add trade form */}
      {showForm ? (
        <div className="add-trade-form">
          <div className="form-row">
            <div className="input-group">
              <label>Shares</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(Number(e.target.value))}
                min={1}
                step={1}
              />
            </div>
            <div className="input-group">
              <label>Buy Price ($)</label>
              <input
                type="number"
                value={buyPrice}
                onChange={e => setBuyPrice(Number(e.target.value))}
                min={0}
                step={0.01}
              />
              <button className="use-current" onClick={() => setBuyPrice(Math.round(currentPrice * 100) / 100)}>
                Use current
              </button>
            </div>
          </div>
          <div className="input-group">
            <label>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Monthly DCA"
              className="note-input"
            />
          </div>
          <div className="form-actions">
            <button className="log-btn" onClick={handleAdd}>Log Trade</button>
            <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="add-trade-btn" onClick={() => setShowForm(true)}>
          + Log a Trade
        </button>
      )}
    </div>
  )
}
