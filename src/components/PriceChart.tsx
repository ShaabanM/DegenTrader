import { useRef, useEffect, useMemo } from 'react'
import type { PricePoint } from '../types/market'
import { formatCurrency, formatDate } from '../utils/format'

interface PriceChartProps {
  history: PricePoint[]
  loading: boolean
  range: string
  onRangeChange: (range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y') => void
  currentPrice: number
  previousClose: number
}

const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y'] as const

export function PriceChart({ history, loading, range, onRangeChange, currentPrice: _currentPrice, previousClose }: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { minPrice, maxPrice, trend } = useMemo(() => {
    if (history.length === 0) return { minPrice: 0, maxPrice: 0, trend: 0 }
    const closes = history.map(p => p.close).filter(c => c > 0)
    return {
      minPrice: Math.min(...closes),
      maxPrice: Math.max(...closes),
      trend: closes.length >= 2 ? closes[closes.length - 1] - closes[0] : 0,
    }
  }, [history])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padding = { top: 20, right: 60, bottom: 30, left: 10 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    // Clear
    ctx.clearRect(0, 0, w, h)

    const closes = history.map(p => p.close).filter(c => c > 0)
    if (closes.length === 0) return

    const priceRange = maxPrice - minPrice || 1
    const pricePadding = priceRange * 0.05
    const yMin = minPrice - pricePadding
    const yMax = maxPrice + pricePadding
    const yRange = yMax - yMin

    const toX = (i: number) => padding.left + (i / (closes.length - 1)) * chartW
    const toY = (price: number) => padding.top + (1 - (price - yMin) / yRange) * chartH

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartH
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(w - padding.right, y)
      ctx.stroke()

      // Price labels
      const price = yMax - (i / gridLines) * yRange
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(formatCurrency(price), w - padding.right + 5, y + 4)
    }

    // Date labels
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    const labelCount = Math.min(6, history.length)
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor(i * (history.length - 1) / (labelCount - 1))
      const x = toX(idx)
      ctx.fillText(formatDate(history[idx].date), x, h - 5)
    }

    // Previous close line
    if (previousClose > yMin && previousClose < yMax) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      const pcY = toY(previousClose)
      ctx.moveTo(padding.left, pcY)
      ctx.lineTo(w - padding.right, pcY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Gradient fill
    const isUp = trend >= 0
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom)
    if (isUp) {
      gradient.addColorStop(0, 'rgba(0, 230, 118, 0.25)')
      gradient.addColorStop(1, 'rgba(0, 230, 118, 0.0)')
    } else {
      gradient.addColorStop(0, 'rgba(255, 82, 82, 0.25)')
      gradient.addColorStop(1, 'rgba(255, 82, 82, 0.0)')
    }

    ctx.beginPath()
    ctx.moveTo(toX(0), toY(closes[0]))
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(toX(i), toY(closes[i]))
    }
    ctx.lineTo(toX(closes.length - 1), h - padding.bottom)
    ctx.lineTo(toX(0), h - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Price line
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(closes[0]))
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(toX(i), toY(closes[i]))
    }
    ctx.strokeStyle = isUp ? '#00e676' : '#ff5252'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Current price dot
    const lastX = toX(closes.length - 1)
    const lastY = toY(closes[closes.length - 1])
    ctx.beginPath()
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2)
    ctx.fillStyle = isUp ? '#00e676' : '#ff5252'
    ctx.fill()

    // Glow on dot
    ctx.beginPath()
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2)
    ctx.fillStyle = isUp ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 82, 82, 0.3)'
    ctx.fill()

  }, [history, maxPrice, minPrice, previousClose, trend])

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3 className="card-title">Price History</h3>
        <div className="range-selector">
          {RANGES.map(r => (
            <button
              key={r}
              className={`range-btn ${r === range ? 'active' : ''}`}
              onClick={() => onRangeChange(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        {loading ? (
          <div className="chart-loading">Loading chart...</div>
        ) : (
          <canvas ref={canvasRef} className="price-canvas" />
        )}
      </div>

      <div className="chart-footer">
        <span className="chart-stat">
          Range: {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
        </span>
        <span className={`chart-stat ${trend >= 0 ? 'positive' : 'negative'}`}>
          Period: {trend >= 0 ? '+' : ''}{formatCurrency(trend)}
        </span>
      </div>
    </div>
  )
}
