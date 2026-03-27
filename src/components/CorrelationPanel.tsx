import { useRef, useEffect, useMemo } from 'react'
import type { PricePoint } from '../types/market'
import { returns, rollingCorrelation, crossCorrelation, pearsonCorrelation } from '../algos/utils'

interface CorrelationPanelProps {
  vwraHistory: PricePoint[]
  oilHistory: PricePoint[]
}

function CorrelationChart({ data, label }: { data: number[]; label: string }) {
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
    const pad = { top: 10, right: 10, bottom: 5, left: 10 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    ctx.clearRect(0, 0, w, h)

    // Zero line
    const zeroY = pad.top + ch / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, zeroY)
    ctx.lineTo(w - pad.right, zeroY)
    ctx.stroke()

    // Correlation line
    const validData = data.filter(d => !isNaN(d))
    if (validData.length < 2) return

    ctx.strokeStyle = '#448aff'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()

    let first = true
    for (let i = 0; i < data.length; i++) {
      if (isNaN(data[i])) continue
      const x = pad.left + (i / (data.length - 1)) * cw
      const y = pad.top + ((1 - data[i]) / 2) * ch // -1 to 1 mapped to chart height
      if (first) { ctx.moveTo(x, y); first = false }
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(label, pad.left, pad.top + 10)
  }, [data, label])

  return <canvas ref={canvasRef} className="correlation-chart" />
}

function LagBars({ lags }: { lags: number[] }) {
  const maxAbs = Math.max(...lags.map(Math.abs), 0.01)

  return (
    <div className="lag-bars">
      <div className="lag-title">Cross-Correlation (Oil leads VWRA)</div>
      {lags.map((val, i) => (
        <div key={i} className="lag-row">
          <span className="lag-label">Lag {i}d</span>
          <div className="lag-track">
            <div
              className={`lag-fill ${val >= 0 ? 'positive' : 'negative'}`}
              style={{
                width: `${(Math.abs(val) / maxAbs) * 100}%`,
                marginLeft: val < 0 ? 'auto' : undefined,
              }}
            />
          </div>
          <span className="lag-value">{(val * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  )
}

export function CorrelationPanel({ vwraHistory, oilHistory }: CorrelationPanelProps) {
  const stats = useMemo(() => {
    const minLen = Math.min(vwraHistory.length, oilHistory.length)
    if (minLen < 10) return null

    const vCloses = vwraHistory.slice(0, minLen).map(p => p.close)
    const oCloses = oilHistory.slice(0, minLen).map(p => p.close)
    const vRets = returns(vCloses)
    const oRets = returns(oCloses)

    const rolling = rollingCorrelation(oRets, vRets, 10)
    const currentCorr = pearsonCorrelation(
      oRets.slice(-20),
      vRets.slice(-20)
    )
    const lags = crossCorrelation(oRets.slice(-30), vRets.slice(-30), 3)

    return { rolling, currentCorr, lags }
  }, [vwraHistory, oilHistory])

  if (!stats) {
    return (
      <div className="correlation-panel card">
        <h3 className="card-title">OIL-VWRA CORRELATION</h3>
        <p className="signal-reasoning">Waiting for sufficient data...</p>
      </div>
    )
  }

  const corrAbs = Math.abs(stats.currentCorr)
  const corrLabel = corrAbs > 0.7 ? 'STRONG' : corrAbs > 0.4 ? 'MODERATE' : 'WEAK'

  return (
    <div className="correlation-panel card">
      <h3 className="card-title">
        OIL-VWRA CORRELATION
        <span className="subtitle">20-day</span>
      </h3>

      <div className="corr-hero">
        <span className={`corr-value ${stats.currentCorr >= 0 ? 'positive' : 'negative'}`}>
          {(stats.currentCorr * 100).toFixed(0)}%
        </span>
        <span className="corr-label">{corrLabel}</span>
      </div>

      <CorrelationChart data={stats.rolling} label="10d Rolling" />

      <LagBars lags={stats.lags} />
    </div>
  )
}
