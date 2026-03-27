import { useRef, useCallback } from 'react'

export type TabId = 'live' | 'algos' | 'backtest' | 'trade'

interface TabNavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'live', label: 'Live', icon: '⚡' },
  { id: 'algos', label: 'Algos', icon: '🤖' },
  { id: 'backtest', label: 'Backtest', icon: '📊' },
  { id: 'trade', label: 'Trade', icon: '💰' },
]

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const touchStart = useRef<{ x: number; time: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dt = Date.now() - touchStart.current.time
    touchStart.current = null

    // Swipe threshold: 60px within 300ms
    if (Math.abs(dx) < 60 || dt > 300) return

    const currentIdx = TABS.findIndex(t => t.id === activeTab)
    if (dx < 0 && currentIdx < TABS.length - 1) {
      onTabChange(TABS[currentIdx + 1].id)
    } else if (dx > 0 && currentIdx > 0) {
      onTabChange(TABS[currentIdx - 1].id)
    }
  }, [activeTab, onTabChange])

  return (
    <nav
      className="tab-nav"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab-item ${tab.id === activeTab ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
