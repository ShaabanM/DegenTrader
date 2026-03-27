export type TabId = 'live' | 'algos' | 'backtest' | 'trade'

interface TabNavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'live', label: 'Cockpit' },
  { id: 'algos', label: 'Models' },
  { id: 'backtest', label: 'Replay' },
  { id: 'trade', label: 'Journal' },
]

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={tab.id === activeTab ? 'active' : ''}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
