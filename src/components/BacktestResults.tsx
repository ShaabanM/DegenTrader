import { useState, useRef, useEffect } from 'react'
import type { BacktestResult } from '../types/market'
import { formatCurrency, formatPercent, formatDate } from '../utils/format'

interface BacktestResultsProps {
  results: BacktestResult[]
}

function EquityCurve({ data, color }: { data: { date: string; equity: number }[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const pad = { top: 15, right: 50, bottom: 25, left: 10 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    const equities = data.map(d => d.equity)
    const min = Math.min(...equities) * 0.99
    const max = Math.max(...equities) * 1.01
    const range = max - min || 1

    ctx.clearRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * ch
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()

      const price = max - (i / 4) * range
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`$${price.toFixed(0)}`, w - pad.right + 4, y + 3)
    }

    // 10k reference line
    const refY = pad.top + (1 - (10000 - min) / range) * ch
    if (refY > pad.top && refY < h - pad.bottom) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(pad.left, refY)
      ctx.lineTo(w - pad.right, refY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Gradient fill
    const isUp = equities[equities.length - 1] >= 10000
    const gradient = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom)
    gradient.addColorStop(0, isUp ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)')
    gradient.addColorStop(1, 'transparent')

    const toX = (i: number) => pad.left + (i / (data.length - 1)) * cw
    const toY = (val: number) => pad.top + (1 - (val - min) / range) * ch

    ctx.beginPath()
    ctx.moveTo(toX(0), toY(equities[0]))
    for (let i = 1; i < equities.length; i++) ctx.lineTo(toX(i), toY(equities[i]))
    ctx.lineTo(toX(equities.length - 1), h - pad.bottom)
    ctx.lineTo(toX(0), h - pad.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Line
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(equities[0]))
    for (let i = 1; i < equities.length; i++) ctx.lineTo(toX(i), toY(equities[i]))
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Date labels
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    const labelCount = Math.min(4, data.length)
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor(i * (data.length - 1) / (labelCount - 1))
      ctx.fillText(formatDate(data[idx].date), toX(idx), h - 5)
    }
  }, [data, color])

  return <canvas ref={canvasRef} className="equity-canvas" />
}

function StatsGrid({ result }: { result: BacktestResult }) {
  const isPositive = result.totalReturn >= 0

  return (
    <div className="bt-stats-grid">
      <div className="bt-stat">
        <span className="bt-stat-label">Total Return</span>
        <span className={`bt-stat-value ${isPositive ? 'positive' : 'negative'}`}>
          {formatCurrency(result.totalReturn)}
        </span>
        <span className={`bt-stat-pct ${isPositive ? 'positive' : 'negative'}`}>
          {formatPercent(result.totalReturnPct)}
        </span>
      </div>
      <div className="bt-stat">
        <span className="bt-stat-label">Win Rate</span>
        <span className="bt-stat-value">{result.winRate.toFixed(0)}%</span>
      </div>
      <div className="bt-stat">
        <span className="bt-stat-label">Max Drawdown</span>
        <span className="bt-stat-value negative">-{result.maxDrawdown.toFixed(1)}%</span>
      </div>
      <div className="bt-stat">
        <span className="bt-stat-label">Trades</span>
        <span className="bt-stat-value">{result.trades.length}</span>
      </div>
      <div className="bt-stat">
        <span className="bt-stat-label">Sharpe</span>
        <span className="bt-stat-value">{result.sharpeRatio.toFixed(2)}</span>
      </div>
    </div>
  )
}

function CompareView({ results }: { results: BacktestResult[] }) {
  return (
    <div className="bt-compare">
      <div className="bt-compare-table">
        <div className="bt-compare-header">
          <span>Algorithm</span>
          <span>Return</span>
          <span>Win%</span>
          <span>Drawdown</span>
          <span>Trades</span>
        </div>
        {results.map(r => (
          <div key={r.algoId} className="bt-compare-row">
            <span className="bt-compare-name">{r.algoName}</span>
            <span className={r.totalReturn >= 0 ? 'positive' : 'negative'}>
              {formatPercent(r.totalReturnPct)}
            </span>
            <span>{r.winRate.toFixed(0)}%</span>
            <span className="negative">-{r.maxDrawdown.toFixed(1)}%</span>
            <span>{r.trades.length}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TradeList({ result }: { result: BacktestResult }) {
  if (result.trades.length === 0) return <p className="signal-reasoning">No trades generated</p>

  return (
    <div className="bt-trade-list">
      <div className="bt-trade-header">
        <span>Entry</span>
        <span>Exit</span>
        <span>Type</span>
        <span>P&L</span>
      </div>
      {result.trades.slice(-20).reverse().map((trade, i) => (
        <div key={i} className="bt-trade-row">
          <span className="bt-trade-date">{formatDate(trade.entryDate)}</span>
          <span className="bt-trade-date">{formatDate(trade.exitDate)}</span>
          <span className={`bt-trade-type ${trade.action === 'BUY' ? 'positive' : 'negative'}`}>
            {trade.action}
          </span>
          <span className={trade.pnl >= 0 ? 'positive' : 'negative'}>
            {formatPercent(trade.pnlPct)}
          </span>
        </div>
      ))}
    </div>
  )
}

const COLORS = ['#00e676', '#448aff', '#ffd740', '#ff9100', '#e040fb']

export function BacktestResults({ results }: BacktestResultsProps) {
  const [selectedAlgo, setSelectedAlgo] = useState<string>('compare')

  if (results.length === 0) {
    return (
      <div className="backtest-panel card">
        <h3 className="card-title">BACKTEST RESULTS</h3>
        <p className="signal-reasoning">Loading historical data...</p>
      </div>
    )
  }

  const selectedResult = results.find(r => r.algoId === selectedAlgo)

  return (
    <div className="backtest-panel card">
      <h3 className="card-title">
        BACKTEST RESULTS
        <span className="subtitle">Since Mar 1, 2026 · $10k start</span>
      </h3>

      <div className="bt-tabs">
        <button
          className={`bt-tab ${selectedAlgo === 'compare' ? 'active' : ''}`}
          onClick={() => setSelectedAlgo('compare')}
        >
          Compare
        </button>
        {results.map(r => (
          <button
            key={r.algoId}
            className={`bt-tab ${selectedAlgo === r.algoId ? 'active' : ''}`}
            onClick={() => setSelectedAlgo(r.algoId)}
          >
            {r.algoName}
          </button>
        ))}
      </div>

      {selectedAlgo === 'compare' ? (
        <>
          <CompareView results={results} />
          <div className="equity-chart-container">
            {results.map((r, i) => (
              r.equityCurve.length > 1 && (
                <div key={r.algoId} className="equity-overlay">
                  <EquityCurve data={r.equityCurve} color={COLORS[i % COLORS.length]} />
                  <span className="equity-legend" style={{ color: COLORS[i % COLORS.length] }}>
                    {r.algoName}: {formatPercent(r.totalReturnPct)}
                  </span>
                </div>
              )
            ))}
          </div>
        </>
      ) : selectedResult ? (
        <>
          <StatsGrid result={selectedResult} />
          <div className="equity-chart-container">
            <EquityCurve
              data={selectedResult.equityCurve}
              color={COLORS[results.findIndex(r => r.algoId === selectedAlgo) % COLORS.length]}
            />
          </div>
          <TradeList result={selectedResult} />
        </>
      ) : null}
    </div>
  )
}
