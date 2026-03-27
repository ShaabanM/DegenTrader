import type { AlgoSignal, BacktestResult, ConsensusSignal } from '../types/market'
import { formatPercent } from '../utils/format'

interface AlgoDashboardProps {
  signals: AlgoSignal[]
  backtests: BacktestResult[]
  consensus: ConsensusSignal
  compact?: boolean
}

function actionClass(action: AlgoSignal['action']) {
  return `action-${action.toLowerCase()}`
}

export function AlgoDashboard({ signals, backtests, consensus, compact = false }: AlgoDashboardProps) {
  const resultsById = new Map(backtests.map(result => [result.algoId, result]))
  const orderedSignals = [...signals].sort((left, right) => {
    const leftAlpha = resultsById.get(left.id)?.alphaPct ?? -999
    const rightAlpha = resultsById.get(right.id)?.alphaPct ?? -999
    return rightAlpha - leftAlpha || right.confidence - left.confidence
  })

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Model board</span>
          <h2>What the algos think right now</h2>
        </div>
        <div className="model-counts">
          <span>{consensus.buyCount} buy</span>
          <span>{consensus.sellCount} sell</span>
          <span>{consensus.flatCount} flat</span>
        </div>
      </div>

      <div className="signal-grid">
        {orderedSignals.map(signal => {
          const backtest = resultsById.get(signal.id)
          return (
            <article key={signal.id} className={`signal-card ${actionClass(signal.action)}`}>
              <div className="signal-card-head">
                <div>
                  <span className="signal-category">{signal.category}</span>
                  <h3>{signal.name}</h3>
                </div>
                <span className={`signal-pill ${actionClass(signal.action)}`}>{signal.action}</span>
              </div>

              <div className="signal-meta-row">
                <span>{signal.horizon}</span>
                <span>{(signal.confidence * 100).toFixed(0)}% live</span>
                {backtest && <span>{formatPercent(backtest.alphaPct)} alpha</span>}
              </div>

              <p className="signal-reason">{signal.reasoning}</p>

              {!compact && signal.reasons.length > 0 && (
                <div className="signal-points">
                  {signal.reasons.slice(0, 3).map(reason => (
                    <span key={reason}>{reason}</span>
                  ))}
                </div>
              )}

              <div className="signal-metrics">
                {signal.metrics.slice(0, compact ? 2 : 3).map(metric => (
                  <div key={metric.label} className={`metric-chip tone-${metric.tone ?? 'neutral'}`}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              {backtest && (
                <div className="signal-footer">
                  <span>Backtest {formatPercent(backtest.totalReturnPct)}</span>
                  <span>Win {backtest.winRate.toFixed(0)}%</span>
                  <span>Exposure {backtest.exposurePct.toFixed(0)}%</span>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
