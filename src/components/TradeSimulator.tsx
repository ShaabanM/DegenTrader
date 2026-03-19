import { useState, useMemo } from 'react'
import { simulateTrade } from '../utils/fees'
import { formatCurrency, formatPercent } from '../utils/format'

interface TradeSimulatorProps {
  currentPrice: number
}

export function TradeSimulator({ currentPrice }: TradeSimulatorProps) {
  const [investment, setInvestment] = useState(5000)
  const [buyPrice, setBuyPrice] = useState(currentPrice)
  const [sellPrice, setSellPrice] = useState(currentPrice * 1.02) // default 2% up
  const [needsFx, setNeedsFx] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Sync buy price with current price on first load
  if (!initialized && currentPrice > 0) {
    setBuyPrice(Math.round(currentPrice * 100) / 100)
    setSellPrice(Math.round(currentPrice * 1.02 * 100) / 100)
    setInitialized(true)
  }

  const result = useMemo(
    () => simulateTrade(investment, buyPrice, sellPrice, needsFx),
    [investment, buyPrice, sellPrice, needsFx]
  )

  const isProfit = result.netProfit >= 0

  return (
    <div className="card simulator-card">
      <h3 className="card-title">
        Trade Simulator
        <span className="subtitle">IBKR Tiered Pricing // LSE</span>
      </h3>

      <div className="sim-layout">
        <div className="sim-inputs">
          <div className="input-group">
            <label>Investment Amount</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={investment}
                onChange={e => setInvestment(Number(e.target.value))}
                min={0}
                step={100}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Buy Price</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={buyPrice}
                onChange={e => setBuyPrice(Number(e.target.value))}
                min={0}
                step={0.01}
              />
            </div>
            <button className="use-current" onClick={() => setBuyPrice(Math.round(currentPrice * 100) / 100)}>
              Use current
            </button>
          </div>

          <div className="input-group">
            <label>Sell Price</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={sellPrice}
                onChange={e => setSellPrice(Number(e.target.value))}
                min={0}
                step={0.01}
              />
            </div>
            <div className="quick-pcts">
              {[-5, -2, -1, 1, 2, 5].map(pct => (
                <button
                  key={pct}
                  className={`pct-btn ${pct > 0 ? 'up' : 'down'}`}
                  onClick={() => setSellPrice(Math.round(buyPrice * (1 + pct / 100) * 100) / 100)}
                >
                  {pct > 0 ? '+' : ''}{pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="input-group toggle-group">
            <label>FX Conversion (non-USD &rarr; USD)</label>
            <button
              className={`toggle ${needsFx ? 'on' : 'off'}`}
              onClick={() => setNeedsFx(!needsFx)}
            >
              {needsFx ? 'YES' : 'NO'}
            </button>
          </div>
        </div>

        <div className="sim-results">
          <div className="result-hero">
            <span className="result-label">Net P&L</span>
            <span className={`result-value ${isProfit ? 'positive' : 'negative'}`}>
              {formatCurrency(result.netProfit)}
            </span>
            <span className={`result-pct ${isProfit ? 'positive' : 'negative'}`}>
              {formatPercent(result.returnPct)}
            </span>
          </div>

          <div className="result-details">
            <div className="detail-row">
              <span>Shares purchased</span>
              <span className="mono">{result.shares}</span>
            </div>
            <div className="detail-row">
              <span>Actual cost</span>
              <span className="mono">{formatCurrency(result.actualCost)}</span>
            </div>
            <div className="detail-row">
              <span>Unused cash</span>
              <span className="mono">{formatCurrency(result.unusedCash)}</span>
            </div>
            <div className="detail-row separator">
              <span>Gross P&L</span>
              <span className={`mono ${result.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(result.grossProfit)}
              </span>
            </div>

            <div className="fee-breakdown">
              <div className="detail-row fee">
                <span>Buy commission</span>
                <span className="mono negative">-{formatCurrency(result.buyFees.commission)}</span>
              </div>
              <div className="detail-row fee">
                <span>Buy exchange fee</span>
                <span className="mono negative">-{formatCurrency(result.buyFees.exchangeFee)}</span>
              </div>
              <div className="detail-row fee">
                <span>Sell commission</span>
                <span className="mono negative">-{formatCurrency(result.sellFees.commission)}</span>
              </div>
              <div className="detail-row fee">
                <span>Sell exchange fee</span>
                <span className="mono negative">-{formatCurrency(result.sellFees.exchangeFee)}</span>
              </div>
              {needsFx && (
                <div className="detail-row fee">
                  <span>FX spread (round-trip)</span>
                  <span className="mono negative">
                    -{formatCurrency(result.buyFees.fxCost + result.sellFees.fxCost)}
                  </span>
                </div>
              )}
              <div className="detail-row total-fees">
                <span>Total fees</span>
                <span className="mono negative">-{formatCurrency(result.totalFees)}</span>
              </div>
            </div>

            <div className="detail-row highlight">
              <span>Break-even sell price</span>
              <span className="mono">{formatCurrency(result.breakEvenPrice)}</span>
            </div>
            <div className="detail-row">
              <span>Break-even move needed</span>
              <span className="mono">
                {buyPrice > 0 ? formatPercent(((result.breakEvenPrice - buyPrice) / buyPrice) * 100) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
