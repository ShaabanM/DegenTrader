import type { AlgoSignal, SignalAction } from '../types/market'

interface AlgoDashboardProps {
  signals: AlgoSignal[]
  compact?: boolean
}

function getSignalColor(action: SignalAction): string {
  switch (action) {
    case 'BUY': return 'signal-buy'
    case 'SELL': return 'signal-sell'
    case 'FLAT': return 'signal-flat'
  }
}

function getSignalEmoji(action: SignalAction): string {
  switch (action) {
    case 'BUY': return '▲'
    case 'SELL': return '▼'
    case 'FLAT': return '—'
  }
}

function ConsensusBar({ signals }: { signals: AlgoSignal[] }) {
  const active = signals.filter(s => s.action !== 'FLAT')
  if (active.length === 0) {
    return (
      <div className="consensus-bar signal-flat">
        <span className="consensus-label">CONSENSUS</span>
        <span className="consensus-action">FLAT</span>
        <span className="consensus-detail">No strong signals</span>
      </div>
    )
  }

  let buyWeight = 0
  let sellWeight = 0
  for (const s of signals) {
    if (s.action === 'BUY') buyWeight += s.confidence
    else if (s.action === 'SELL') sellWeight += s.confidence
  }

  const totalWeight = buyWeight + sellWeight
  const consensus: SignalAction = buyWeight > sellWeight ? 'BUY' : sellWeight > buyWeight ? 'SELL' : 'FLAT'
  const avgConfidence = totalWeight > 0
    ? (consensus === 'BUY' ? buyWeight : sellWeight) / signals.length
    : 0

  return (
    <div className={`consensus-bar ${getSignalColor(consensus)}`}>
      <span className="consensus-label">CONSENSUS</span>
      <span className="consensus-action">
        {getSignalEmoji(consensus)} {consensus}
      </span>
      <div className="consensus-meter">
        <div
          className="consensus-fill"
          style={{ width: `${avgConfidence * 100}%` }}
        />
      </div>
      <span className="consensus-detail">
        {signals.filter(s => s.action === 'BUY').length}B / {signals.filter(s => s.action === 'SELL').length}S / {signals.filter(s => s.action === 'FLAT').length}F
      </span>
    </div>
  )
}

function SignalCard({ signal, compact }: { signal: AlgoSignal; compact?: boolean }) {
  return (
    <div className={`signal-card ${getSignalColor(signal.action)}`}>
      <div className="signal-header">
        <span className="signal-name">{signal.name}</span>
        <span className={`signal-badge ${getSignalColor(signal.action)}`}>
          {getSignalEmoji(signal.action)} {signal.action}
        </span>
      </div>

      <div className="confidence-bar">
        <div
          className="confidence-fill"
          style={{ width: `${signal.confidence * 100}%` }}
        />
        <span className="confidence-text">{(signal.confidence * 100).toFixed(0)}%</span>
      </div>

      {!compact && (
        <p className="signal-reasoning">{signal.reasoning}</p>
      )}

      {!compact && signal.entryPrice && (
        <div className="signal-prices">
          <span>Entry: ${signal.entryPrice.toFixed(2)}</span>
          {signal.exitPrice && <span>Target: ${signal.exitPrice.toFixed(2)}</span>}
        </div>
      )}
    </div>
  )
}

export function AlgoDashboard({ signals, compact = false }: AlgoDashboardProps) {
  return (
    <div className="algo-dashboard card">
      <h3 className="card-title">
        ALGO SIGNALS
        <span className="subtitle">Updated every 30s</span>
      </h3>

      <ConsensusBar signals={signals} />

      <div className="signals-grid">
        {signals.map(signal => (
          <SignalCard key={signal.id} signal={signal} compact={compact} />
        ))}
      </div>
    </div>
  )
}
