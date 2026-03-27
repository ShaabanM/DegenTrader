import { useMemo, useState } from 'react'
import type { BacktestResult, EquityPoint } from '../types/market'
import { formatCurrency, formatDateTime, formatPercent } from '../utils/format'

interface BacktestResultsProps {
  results: BacktestResult[]
  startingCapital: number
  onStartingCapitalChange: (value: number) => void
}

function curvePath(points: EquityPoint[], field: 'equity' | 'benchmark') {
  const values = points.map(point => point[field] ?? point.equity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  return points.map((point, index) => {
    const value = point[field] ?? point.equity
    const x = (index / Math.max(points.length - 1, 1)) * 100
    const y = 100 - ((value - min) / span) * 100
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
}

export function BacktestResults({ results, startingCapital, onStartingCapitalChange }: BacktestResultsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(() => {
    if (results.length === 0) return null
    return results.find(result => result.algoId === selectedId) ?? results[0]
  }, [results, selectedId])

  if (results.length === 0 || !selected) {
    return (
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Backtest lab</span>
            <h2>Running March 2026 replay</h2>
          </div>
        </div>
        <div className="chart-empty">Loading the aligned 30m history and replaying each model...</div>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-head backtest-head">
        <div>
          <span className="eyebrow">Backtest lab</span>
          <h2>Since 1 March 2026</h2>
        </div>
        <label className="capital-input">
          <span>Paper capital</span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={startingCapital}
            onChange={event => onStartingCapitalChange(Number(event.target.value) || 10000)}
          />
        </label>
      </div>

      <div className="backtest-table">
        <div className="backtest-row backtest-header">
          <span>Model</span>
          <span>Return</span>
          <span>Alpha</span>
          <span>Win</span>
          <span>Exposure</span>
        </div>
        {results.map(result => (
          <button
            key={result.algoId}
            className={`backtest-row ${selected.algoId === result.algoId ? 'selected' : ''}`}
            onClick={() => setSelectedId(result.algoId)}
          >
            <span>{result.algoName}</span>
            <span className={result.totalReturnPct >= 0 ? 'positive' : 'negative'}>{formatPercent(result.totalReturnPct)}</span>
            <span className={result.alphaPct >= 0 ? 'positive' : 'negative'}>{formatPercent(result.alphaPct)}</span>
            <span>{result.winRate.toFixed(0)}%</span>
            <span>{result.exposurePct.toFixed(0)}%</span>
          </button>
        ))}
      </div>

      <div className="backtest-detail">
        <div className="detail-summary">
          <div>
            <h3>{selected.algoName}</h3>
            <p>{selected.description}</p>
          </div>
          <div className="detail-stats">
            <span>{selected.horizon}</span>
            <span>{selected.trades.length} trades</span>
            <span>{selected.avgHoldBars.toFixed(1)} bars avg hold</span>
          </div>
        </div>

        <div className="equity-panel">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Equity curve">
            <path d={curvePath(selected.equityCurve, 'benchmark')} className="equity-line benchmark" />
            <path d={curvePath(selected.equityCurve, 'equity')} className="equity-line strategy" />
          </svg>
        </div>

        <div className="pulse-grid">
          <article className="pulse-stat">
            <span>Final equity</span>
            <strong>{formatCurrency(selected.finalEquity)}</strong>
            <small>{formatPercent(selected.totalReturnPct)} total</small>
          </article>
          <article className="pulse-stat">
            <span>Alpha vs hold</span>
            <strong className={selected.alphaPct >= 0 ? 'positive' : 'negative'}>{formatPercent(selected.alphaPct)}</strong>
            <small>Benchmark {formatPercent(selected.benchmarkReturnPct)}</small>
          </article>
          <article className="pulse-stat">
            <span>Win rate</span>
            <strong>{selected.winRate.toFixed(0)}%</strong>
            <small>Sharpe {selected.sharpeRatio.toFixed(2)}</small>
          </article>
          <article className="pulse-stat">
            <span>Drawdown</span>
            <strong className="negative">-{selected.maxDrawdown.toFixed(1)}%</strong>
            <small>Exposure {selected.exposurePct.toFixed(0)}%</small>
          </article>
        </div>

        <div className="trade-tape">
          <div className="trade-tape-head">
            <span>Recent replay trades</span>
            <span>BUY = enter VWRA, SELL = exit to cash</span>
          </div>
          {selected.trades.length === 0 ? (
            <div className="chart-empty">This model did not trigger enough clean entries.</div>
          ) : (
            selected.trades.slice(-8).reverse().map((trade, index) => (
              <div key={`${trade.entryDate}-${index}`} className="trade-tape-row">
                <span>{formatDateTime(trade.entryDate)}</span>
                <span>{formatDateTime(trade.exitDate)}</span>
                <span>{trade.barsHeld ?? 0} bars</span>
                <span className={trade.pnlPct >= 0 ? 'positive' : 'negative'}>{formatPercent(trade.pnlPct)}</span>
                <span>{trade.exitReason ?? 'signal'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
