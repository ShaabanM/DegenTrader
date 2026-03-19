export function FutureModules() {
  const modules = [
    {
      title: 'AI Sentiment Analysis',
      description: 'LLM-powered semantic analysis of financial news, central bank statements, and social media for VWRA-relevant signals',
      status: 'Phase 2',
      icon: '\u{1f9e0}',
    },
    {
      title: 'Algorithmic Signals',
      description: 'Technical analysis with momentum, mean-reversion, and volatility strategies tailored for VWRA day trading',
      status: 'Phase 3',
      icon: '\u{1f4ca}',
    },
    {
      title: 'Portfolio Tracker',
      description: 'Track your actual IBKR positions, P&L history, and cumulative fee impact over time',
      status: 'Phase 2',
      icon: '\u{1f4bc}',
    },
    {
      title: 'T-Bill Monitor',
      description: 'U03A Irish-domiciled T-Bill ETF tracking for your cash parking strategy',
      status: 'Phase 2',
      icon: '\u{1f3e6}',
    },
  ]

  return (
    <div className="future-modules">
      <h3 className="section-title">Coming Soon</h3>
      <div className="modules-grid">
        {modules.map(mod => (
          <div key={mod.title} className="module-card">
            <div className="module-icon">{mod.icon}</div>
            <div className="module-info">
              <h4>{mod.title}</h4>
              <p>{mod.description}</p>
            </div>
            <span className="module-status">{mod.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
