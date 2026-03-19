import type { MarketData } from '../types/market'
import { formatCurrency, formatNumber, formatPercent } from '../utils/format'

interface MarketStatsProps {
  data: MarketData
}

export function MarketStats({ data }: MarketStatsProps) {
  const stats = [
    { label: 'Open', value: formatCurrency(data.open) },
    { label: 'Prev Close', value: formatCurrency(data.previousClose) },
    { label: 'Volume', value: formatNumber(data.volume) },
    { label: 'Avg Volume', value: formatNumber(data.avgVolume) },
    { label: '52W High', value: formatCurrency(data.week52High) },
    { label: '52W Low', value: formatCurrency(data.week52Low) },
    { label: 'NAV', value: formatCurrency(data.nav) },
    { label: 'TER', value: formatPercent(data.expenseRatio * 100) },
  ]

  const volRatio = data.avgVolume > 0 ? data.volume / data.avgVolume : 1
  const priceVs52H = ((data.price - data.week52High) / data.week52High) * 100
  const priceVs52L = ((data.price - data.week52Low) / data.week52Low) * 100

  return (
    <div className="card market-stats">
      <h3 className="card-title">Market Data</h3>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-item">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="stat-insights">
        <div className={`insight ${volRatio > 1.3 ? 'hot' : volRatio < 0.7 ? 'cold' : ''}`}>
          <span className="insight-label">Vol Ratio</span>
          <span className="insight-value">{volRatio.toFixed(2)}x</span>
          <span className="insight-tag">
            {volRatio > 1.5 ? 'UNUSUAL' : volRatio > 1.2 ? 'ELEVATED' : volRatio < 0.7 ? 'LOW' : 'NORMAL'}
          </span>
        </div>
        <div className="insight">
          <span className="insight-label">vs 52W High</span>
          <span className={`insight-value ${priceVs52H >= 0 ? 'positive' : 'negative'}`}>
            {formatPercent(priceVs52H)}
          </span>
        </div>
        <div className="insight">
          <span className="insight-label">vs 52W Low</span>
          <span className={`insight-value ${priceVs52L >= 0 ? 'positive' : 'negative'}`}>
            {formatPercent(priceVs52L)}
          </span>
        </div>
      </div>
    </div>
  )
}
