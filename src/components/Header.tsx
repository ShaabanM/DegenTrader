import type { ConsensusSignal } from '../types/market'
import { formatRelativeTime, formatTime } from '../utils/format'

interface HeaderProps {
  lastRefresh: number
  onRefresh: () => void
  consensus: ConsensusSignal
  loading: boolean
}

export function Header({ lastRefresh, onRefresh, consensus, loading }: HeaderProps) {
  const open = isMarketOpen()

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="eyebrow">VWRA tactical dashboard</span>
        <h1>Trader Degen</h1>
        <p>BUY means get long. SELL means get back to cash and wait.</p>
      </div>

      <div className="topbar-meta">
        <div className="topbar-chip">
          <span className={`status-dot ${open ? 'open' : 'closed'}`} />
          {open ? 'LSE open' : 'LSE closed'}
        </div>
        <div className={`topbar-chip action-${consensus.action.toLowerCase()}`}>
          {consensus.label}
        </div>
        {lastRefresh > 0 && (
          <div className="topbar-update">
            <span>{formatTime(lastRefresh)}</span>
            <span>{formatRelativeTime(lastRefresh)}</span>
          </div>
        )}
        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </header>
  )
}

function isMarketOpen(): boolean {
  const now = new Date()
  const londonNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }))
  const day = londonNow.getDay()
  const minutes = londonNow.getHours() * 60 + londonNow.getMinutes()
  return day >= 1 && day <= 5 && minutes >= 8 * 60 && minutes <= 16 * 60 + 30
}
