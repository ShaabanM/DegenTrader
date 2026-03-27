import { useMemo, useState } from 'react'
import type { SignalAction } from '../types/market'
import { simulateTrade } from '../utils/fees'
import { formatCurrency, formatPercent } from '../utils/format'

interface TradeSimulatorProps {
  currentPrice: number
  consensusAction: SignalAction
}

export function TradeSimulator({ currentPrice, consensusAction }: TradeSimulatorProps) {
  const [investment, setInvestment] = useState(5000)
  const [buyPriceOverride, setBuyPriceOverride] = useState<number | null>(null)
  const [sellPriceOverride, setSellPriceOverride] = useState<number | null>(null)
  const [needsFx, setNeedsFx] = useState(false)

  const buyPrice = buyPriceOverride ?? currentPrice
  const sellPrice = sellPriceOverride ?? currentPrice * (consensusAction === 'SELL' ? 0.99 : 1.01)

  const result = useMemo(
    () => simulateTrade(investment, buyPrice, sellPrice, needsFx),
    [investment, buyPrice, sellPrice, needsFx],
  )

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Trade planner</span>
          <h2>Manual execution sanity check</h2>
        </div>
        <div className={`signal-pill action-${consensusAction.toLowerCase()}`}>{consensusAction}</div>
      </div>

      <div className="sim-grid">
        <div className="form-stack">
          <label className="field">
            <span>Capital</span>
            <input type="number" min={0} step={500} value={investment} onChange={event => setInvestment(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Buy price</span>
            <input type="number" min={0} step={0.01} value={buyPrice} onChange={event => setBuyPriceOverride(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Sell price</span>
            <input type="number" min={0} step={0.01} value={sellPrice} onChange={event => setSellPriceOverride(Number(event.target.value))} />
          </label>

          <div className="button-row">
            {[-2, -1, 1, 2, 3].map(step => (
              <button key={step} className="ghost-btn" onClick={() => setSellPriceOverride(Number((buyPrice * (1 + step / 100)).toFixed(2)))}>
                {step > 0 ? '+' : ''}{step}%
              </button>
            ))}
          </div>

          <button className={`toggle-btn ${needsFx ? 'active' : ''}`} onClick={() => setNeedsFx(value => !value)}>
            FX conversion {needsFx ? 'on' : 'off'}
          </button>
        </div>

        <div className="planner-summary">
          <div className="planner-hero">
            <span>Net P&L</span>
            <strong className={result.netProfit >= 0 ? 'positive' : 'negative'}>{formatCurrency(result.netProfit)}</strong>
            <small className={result.netProfit >= 0 ? 'positive' : 'negative'}>{formatPercent(result.returnPct)}</small>
          </div>

          <div className="planner-list">
            <div><span>Shares</span><strong>{result.shares}</strong></div>
            <div><span>Actual cost</span><strong>{formatCurrency(result.actualCost)}</strong></div>
            <div><span>Unused cash</span><strong>{formatCurrency(result.unusedCash)}</strong></div>
            <div><span>Total fees</span><strong className="negative">{formatCurrency(-result.totalFees)}</strong></div>
            <div><span>Break-even sell</span><strong>{formatCurrency(result.breakEvenPrice)}</strong></div>
            <div><span>Move needed</span><strong>{buyPrice > 0 ? formatPercent(((result.breakEvenPrice - buyPrice) / buyPrice) * 100) : '—'}</strong></div>
          </div>
        </div>
      </div>
    </section>
  )
}
