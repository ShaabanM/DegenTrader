import { formatTime } from '../utils/format'

interface HeaderProps {
  lastRefresh: number
  onRefresh: () => void
}

export function Header({ lastRefresh, onRefresh }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">
          <span className="logo-degen">DEGEN</span>
          <span className="logo-trader">TRADER</span>
        </h1>
        <span className="header-tag">VWRA // LSE</span>
      </div>
      <div className="header-right">
        <div className="market-status">
          <span className={`status-dot ${isMarketOpen() ? 'open' : 'closed'}`} />
          <span className="status-text">{isMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
        </div>
        {lastRefresh > 0 && (
          <span className="last-update">
            Updated {formatTime(lastRefresh)}
          </span>
        )}
        <button className="refresh-btn" onClick={onRefresh} title="Refresh data">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </header>
  )
}

function isMarketOpen(): boolean {
  const now = new Date()
  const londonHour = now.getUTCHours()
  const day = now.getUTCDay()
  // LSE: 08:00-16:30 UTC, Mon-Fri
  return day >= 1 && day <= 5 && londonHour >= 8 && (londonHour < 16 || (londonHour === 16 && now.getUTCMinutes() <= 30))
}
