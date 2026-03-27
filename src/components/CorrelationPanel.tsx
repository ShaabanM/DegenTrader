import type { MarketPulse } from '../types/market'
import { formatCurrency, formatPercent } from '../utils/format'

interface CorrelationPanelProps {
  pulse: MarketPulse | null
  loading: boolean
}

export function CorrelationPanel({ pulse, loading }: CorrelationPanelProps) {
  if (loading || !pulse) {
    return (
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Market pulse</span>
            <h2>Building regime snapshot</h2>
          </div>
        </div>
        <div className="chart-empty">Crunching the intraday context...</div>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Market pulse</span>
          <h2>{pulse.regimeLabel}</h2>
        </div>
        <p className="panel-summary">{pulse.regimeSummary}</p>
      </div>

      <div className="pulse-grid">
        <article className="pulse-stat">
          <span>Correlation (20 bars)</span>
          <strong>{formatPercent(pulse.correlation * 100)}</strong>
          <small>1-bar lag {formatPercent(pulse.lagCorrelation1 * 100)}</small>
        </article>
        <article className="pulse-stat">
          <span>Oil move</span>
          <strong className={pulse.oil2h <= 0 ? 'positive' : 'negative'}>{formatPercent(pulse.oil2h * 100)}</strong>
          <small>Session {formatPercent(pulse.oilSession * 100)}</small>
        </article>
        <article className="pulse-stat">
          <span>VWRA move</span>
          <strong className={pulse.vwra2h >= 0 ? 'positive' : 'negative'}>{formatPercent(pulse.vwra2h * 100)}</strong>
          <small>Session {formatPercent(pulse.vwraSession * 100)}</small>
        </article>
        <article className="pulse-stat">
          <span>VWRA vs VWAP</span>
          <strong className={pulse.distanceFromVwap >= 0 ? 'positive' : 'negative'}>{formatPercent(pulse.distanceFromVwap * 100)}</strong>
          <small>{pulse.sessionTrend} session trend</small>
        </article>
      </div>

      <div className="badge-row">
        {pulse.badges.map(badge => (
          <div key={badge.label} className={`metric-chip tone-${badge.tone ?? 'neutral'}`}>
            <span>{badge.label}</span>
            <strong>{badge.value}</strong>
          </div>
        ))}
      </div>

      <div className="range-callout">
        <div>
          <span>Opening range high</span>
          <strong>{formatCurrency(pulse.openingRangeHigh)}</strong>
        </div>
        <div>
          <span>Opening range low</span>
          <strong>{formatCurrency(pulse.openingRangeLow)}</strong>
        </div>
        <div>
          <span>Range position</span>
          <strong>{formatPercent(pulse.rangePosition * 100, 0)}</strong>
        </div>
      </div>
    </section>
  )
}
