import type { ConsensusSignal, MarketData, MarketPulse } from '../types/market'
import { formatCurrency, formatPercent } from '../utils/format'

interface DualPriceHeaderProps {
  vwra: MarketData
  oil: MarketData
  consensus: ConsensusSignal
  pulse: MarketPulse | null
}

function AssetCard({ label, data }: { label: string; data: MarketData }) {
  const change = data.price - data.previousClose
  const changePct = data.previousClose > 0 ? (change / data.previousClose) * 100 : 0

  return (
    <article className="asset-card">
      <div className="asset-card-head">
        <span className="asset-label">{label}</span>
        <span className="asset-symbol">{data.symbol}</span>
      </div>
      <div className="asset-price">{formatCurrency(data.price, data.currency)}</div>
      <div className={`asset-change ${change >= 0 ? 'positive' : 'negative'}`}>
        {formatCurrency(change, data.currency)} · {formatPercent(changePct)}
      </div>
      <div className="asset-range">
        <span>H {formatCurrency(data.dayHigh, data.currency)}</span>
        <span>L {formatCurrency(data.dayLow, data.currency)}</span>
      </div>
    </article>
  )
}

export function DualPriceHeader({ vwra, oil, consensus, pulse }: DualPriceHeaderProps) {
  return (
    <section className="hero-grid">
      <div className="hero-panel">
        <div className="hero-eyebrow">Decision Now</div>
        <div className={`hero-action action-${consensus.action.toLowerCase()}`}>{consensus.label}</div>
        <div className="hero-confidence">
          <div className="hero-confidence-bar">
            <div style={{ width: `${consensus.confidence * 100}%` }} />
          </div>
          <span>{(consensus.confidence * 100).toFixed(0)}% conviction</span>
        </div>
        <p className="hero-summary">{consensus.summary}</p>
        <div className="hero-support">
          {consensus.support.length > 0 ? consensus.support.join(' · ') : 'No strong model agreement yet'}
        </div>
        {pulse && (
          <div className="hero-regime">
            <span>{pulse.regimeLabel}</span>
            <p>{pulse.regimeSummary}</p>
          </div>
        )}
      </div>

      <div className="asset-card-stack">
        <AssetCard label="VWRA" data={vwra} />
        <AssetCard label="Brent" data={oil} />
      </div>
    </section>
  )
}
