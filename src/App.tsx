import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { DualPriceHeader } from './components/DualPriceHeader'
import { AlgoDashboard } from './components/AlgoDashboard'
import { BacktestResults } from './components/BacktestResults'
import { CorrelationPanel } from './components/CorrelationPanel'
import { PriceChart } from './components/PriceChart'
import { TabNavigation, type TabId } from './components/TabNavigation'
import { TradeLog } from './components/TradeLog'
import { TradeSimulator } from './components/TradeSimulator'
import { useAlgoSignals, useBacktests } from './hooks/useAlgoSignals'
import { useHistoricalData, useMultiMarketData, usePriceHistory } from './hooks/useMarketData'
import { useTradeLog } from './hooks/useTradeLog'
import { buildConsensusSignal, buildMarketPulse } from './services/analysis'
import './App.css'

type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'

function App() {
  const startDate = useMemo(() => new Date('2026-03-01T00:00:00Z'), [])
  const symbols = useMemo(() => ['VWRA.L', 'BZ=F'], [])
  const [activeTab, setActiveTab] = useState<TabId>('live')
  const [chartRange, setChartRange] = useState<ChartRange>('5d')
  const [startingCapital, setStartingCapital] = useState(10000)

  const { data: liveData, loading, error, lastRefresh, refresh } = useMultiMarketData(symbols)
  const { history: vwraChartHistory, loading: chartLoading } = usePriceHistory('VWRA.L', chartRange)
  const { history: oilChartHistory } = usePriceHistory('BZ=F', chartRange)
  const { data: historicalData, loading: historicalLoading } = useHistoricalData(symbols, startDate, '30m')
  const { trades, addTrade, removeTrade, clearAll } = useTradeLog()

  const vwraData = liveData['VWRA.L']
  const oilData = liveData['BZ=F']
  const vwraHistory = useMemo(() => historicalData['VWRA.L'] ?? [], [historicalData])
  const oilHistory = useMemo(() => historicalData['BZ=F'] ?? [], [historicalData])
  const signals = useAlgoSignals(vwraData, oilData, vwraHistory, oilHistory)
  const backtests = useBacktests(vwraHistory, oilHistory, startingCapital)

  const consensus = useMemo(
    () => buildConsensusSignal(signals, backtests),
    [signals, backtests],
  )

  const pulse = useMemo(
    () => buildMarketPulse(vwraData, oilData, vwraHistory, oilHistory),
    [vwraData, oilData, vwraHistory, oilHistory],
  )

  const ready = vwraData && oilData

  return (
    <div className="app-shell">
      <Header
        lastRefresh={lastRefresh}
        onRefresh={refresh}
        consensus={consensus}
        loading={loading}
      />

      <main className="app-main">
        {error && ready && (
          <div className="warning-banner">
            Market refresh hit an error. The dashboard is still showing the latest good snapshot.
          </div>
        )}

        {!ready && loading ? (
          <section className="empty-state">
            <div className="empty-orb" />
            <div>
              <h2>Connecting to VWRA and Brent</h2>
              <p>Loading the live tape and the March 2026 intraday history for the models.</p>
            </div>
          </section>
        ) : !ready ? (
          <section className="empty-state error">
            <div>
              <h2>Couldn’t load market data</h2>
              <p>{error ?? 'Please retry the connection.'}</p>
            </div>
            <button className="primary-btn" onClick={refresh}>Retry</button>
          </section>
        ) : (
          <>
            <DualPriceHeader
              vwra={vwraData}
              oil={oilData}
              consensus={consensus}
              pulse={pulse}
            />

            {activeTab === 'live' && (
              <>
                <AlgoDashboard
                  signals={signals}
                  backtests={backtests}
                  consensus={consensus}
                  compact
                />
                <PriceChart
                  vwraHistory={vwraChartHistory}
                  oilHistory={oilChartHistory}
                  loading={chartLoading}
                  range={chartRange}
                  onRangeChange={setChartRange}
                />
                <CorrelationPanel pulse={pulse} loading={historicalLoading} />
              </>
            )}

            {activeTab === 'algos' && (
              <AlgoDashboard
                signals={signals}
                backtests={backtests}
                consensus={consensus}
              />
            )}

            {activeTab === 'backtest' && (
              <BacktestResults
                results={backtests}
                startingCapital={startingCapital}
                onStartingCapitalChange={setStartingCapital}
              />
            )}

            {activeTab === 'trade' && (
              <div className="trade-tab-grid">
                <TradeSimulator currentPrice={vwraData.price} consensusAction={consensus.action} />
                <TradeLog
                  trades={trades}
                  currentPrice={vwraData.price}
                  onAdd={addTrade}
                  onRemove={removeTrade}
                  onClearAll={clearAll}
                />
              </div>
            )}
          </>
        )}
      </main>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
