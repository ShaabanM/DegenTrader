import type { MarketData } from '../types/market'
import { formatCurrency, formatPercent } from '../utils/format'

interface PriceCardProps {
  data: MarketData
}

export function PriceCard({ data }: PriceCardProps) {
  const change = data.price - data.previousClose
  const changePct = (change / data.previousClose) * 100
  const isPositive = change >= 0

  return (
    <div className="card price-card">
      <div className="price-header">
        <div className="ticker-info">
          <span className="ticker">VWRA.L</span>
          <span className="exchange-badge">LSE</span>
        </div>
        <span className="etf-name">{data.name}</span>
      </div>

      <div className="price-main">
        <span className="current-price">{formatCurrency(data.price)}</span>
        <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          <span className="change-arrow">{isPositive ? '\u25b2' : '\u25bc'}</span>
          <span>{formatCurrency(Math.abs(change))}</span>
          <span className="change-pct">({formatPercent(changePct)})</span>
        </div>
      </div>

      <div className="price-range-bar">
        <div className="range-labels">
          <span>L {formatCurrency(data.dayLow)}</span>
          <span>Day Range</span>
          <span>H {formatCurrency(data.dayHigh)}</span>
        </div>
        <div className="range-track">
          <div
            className="range-fill"
            style={{
              left: `${((data.dayLow - data.dayLow) / (data.dayHigh - data.dayLow)) * 100}%`,
              width: `${((data.price - data.dayLow) / (data.dayHigh - data.dayLow)) * 100}%`,
            }}
          />
          <div
            className="range-marker"
            style={{
              left: `${((data.price - data.dayLow) / (data.dayHigh - data.dayLow)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
