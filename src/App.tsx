import { useState } from 'react'
import { useMultiMarketData, usePriceHistory, useHistoricalData } from './hooks/useMarketData'
import { useAlgoSignals, useBacktests } from './hooks/useAlgoSignals'
import { useTradeLog } from './hooks/useTradeLog'
import { Header } from './components/Header'
import { TabNavigation, type TabId } from './components/TabNavigation'
import { DualPriceHeader } from './components/DualPriceHeader'
import { AlgoDashboard } from './components/AlgoDashboard'
import { CorrelationPanel } from './components/CorrelationPanel'
import { BacktestResults } from './components/BacktestResults'
import { PriceChart } from './components/PriceChart'
import { TradeSimulator } from './components/TradeSimulator'
import { TradeLog } from './components/TradeLog'
import './App.css'

type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('live')
  const [chartRange, setChartRange] = useState<ChartRange>('1mo')

  // Multi-symbol market data (30s polling)
  const { data: multiData, loading, error, lastRefresh, refresh } = useMultiMarketData()

  // Chart data for selected range
  const { history: vwraChartHistory, loading: chartLoading } = usePriceHistory('VWRA.L', chartRange)
  const { history: oilChartHistory } = usePriceHistory('BZ=F', chartRange)

  // Historical data for algos & backtesting (March 1, 2026+)
  const { data: historicalData } = useHistoricalData()
  const vwraHistory = historicalData['VWRA.L'] || []
  const oilHistory = historicalData['BZ=F'] || []

  // Algo signals (live)
  const signals = useAlgoSignals(multiData['VWRA.L'], multiData['BZ=F'], vwraHistory, oilHistory)

  // Backtesting
  const backtests = useBacktests(vwraHistory, oilHistory)

  // Trade log
  const { trades, addTrade, removeTrade, clearAll } = useTradeLog()

  const vwraData = multiData['VWRA.L']
  const oilData = multiData['BZ=F']

  return (
    <div className="app">
      <Header lastRefresh={lastRefresh} onRefresh={refresh} />

      <main className="dashboard">
        {loading && !vwraData ? (
          <div className="loading-state">
            <div className="pulse-ring" />
            <span>Connecting to market data...</span>
          </div>
        ) : error && !vwraData ? (
          <div className="error-state">
            <span>Unable to connect to market data</span>
            <span className="error-detail">{error}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        ) : (
          <>
            {/* Always show dual price header */}
            <DualPriceHeader
              vwra={vwraData}
              oil={oilData}
              vwraHistory={vwraChartHistory}
              oilHistory={oilChartHistory}
            />

            {/* Tab content */}
            {activeTab === 'live' && (
              <>
                <AlgoDashboard signals={signals} compact />

                <section className="chart-section">
                  <PriceChart
                    history={vwraChartHistory}
                    loading={chartLoading}
                    range={chartRange}
                    onRangeChange={setChartRange}
                    currentPrice={vwraData?.price || 0}
                    previousClose={vwraData?.previousClose || 0}
                  />
                </section>

                <CorrelationPanel
                  vwraHistory={vwraHistory}
                  oilHistory={oilHistory}
                />
              </>
            )}

            {activeTab === 'algos' && (
              <AlgoDashboard signals={signals} />
            )}

            {activeTab === 'backtest' && (
              <BacktestResults results={backtests} />
            )}

            {activeTab === 'trade' && (
              <>
                {vwraData && (
                  <section className="simulator-section">
                    <TradeSimulator currentPrice={vwraData.price} />
                  </section>
                )}
                {vwraData && (
                  <section className="trade-log-section">
                    <TradeLog
                      trades={trades}
                      currentPrice={vwraData.price}
                      onAdd={addTrade}
                      onRemove={removeTrade}
                      onClearAll={clearAll}
                    />
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
