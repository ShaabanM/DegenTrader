import { useRef, useEffect } from 'react'
import type { MarketData, PricePoint } from '../types/market'
import { formatCurrency, formatPercent } from '../utils/format'

interface DualPriceHeaderProps {
  vwra: MarketData | undefined
  oil: MarketData | undefined
  vwraHistory: PricePoint[]
  oilHistory: PricePoint[]
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
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
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w
      const y = h - ((data[i] - min) / range) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [data, color])

  return <canvas ref={canvasRef} className="sparkline-canvas" />
}

function PriceCardCompact({ data, history, label }: {
  data: MarketData | undefined
  history: PricePoint[]
  label: string
}) {
  if (!data) {
    return (
      <div className="price-card-compact card">
        <div className="pcc-label">{label}</div>
        <div className="pcc-price">--</div>
      </div>
    )
  }

  const change = data.price - data.previousClose
  const changePct = data.previousClose > 0 ? (change / data.previousClose) * 100 : 0
  const isUp = change >= 0
  const sparkData = history.slice(-20).map(p => p.close).filter(c => c > 0)

  return (
    <div className="price-card-compact card">
      <div className="pcc-top">
        <div>
          <div className="pcc-label">{label}</div>
          <div className="pcc-symbol">{data.symbol}</div>
        </div>
        <Sparkline data={sparkData} color={isUp ? '#00e676' : '#ff5252'} />
      </div>
      <div className="pcc-bottom">
        <span className="pcc-price">{formatCurrency(data.price)}</span>
        <span className={`pcc-change ${isUp ? 'positive' : 'negative'}`}>
          {isUp ? '▲' : '▼'} {formatCurrency(Math.abs(change))} ({formatPercent(changePct)})
        </span>
      </div>
    </div>
  )
}

export function DualPriceHeader({ vwra, oil, vwraHistory, oilHistory }: DualPriceHeaderProps) {
  return (
    <div className="dual-price-row">
      <PriceCardCompact data={vwra} history={vwraHistory} label="VWRA" />
      <PriceCardCompact data={oil} history={oilHistory} label="BRENT" />
    </div>
  )
}
