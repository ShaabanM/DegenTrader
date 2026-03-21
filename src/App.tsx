import { useState } from 'react'
import { useMarketData, usePriceHistory } from './hooks/useMarketData'
import { useTradeLog } from './hooks/useTradeLog'
import { Header } from './components/Header'
import { PriceCard } from './components/PriceCard'
import { MarketStats } from './components/MarketStats'
import { PriceChart } from './components/PriceChart'
import { TradeSimulator } from './components/TradeSimulator'
import { TradeLog } from './components/TradeLog'
import { FutureModules } from './components/FutureModules'
import './App.css'

type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'

function App() {
  const { data, loading, error, lastRefresh, refresh } = useMarketData()
  const [chartRange, setChartRange] = useState<ChartRange>('1mo')
  const { history, loading: chartLoading } = usePriceHistory(chartRange)
  const { trades, addTrade, removeTrade, clearAll } = useTradeLog()

  return (
    <div className="app">
      <Header lastRefresh={lastRefresh} onRefresh={refresh} />

      <main className="dashboard">
        {loading && !data ? (
          <div className="loading-state">
            <div className="pulse-ring" />
            <span>Connecting to market data...</span>
          </div>
        ) : data ? (
          <>
            <section className="top-row">
              <PriceCard data={data} />
              <MarketStats data={data} />
            </section>

            <section className="chart-section">
              <PriceChart
                history={history}
                loading={chartLoading}
                range={chartRange}
                onRangeChange={setChartRange}
                currentPrice={data.price}
                previousClose={data.previousClose}
              />
            </section>

            <section className="simulator-section">
              <TradeSimulator currentPrice={data.price} />
            </section>

            <section className="trade-log-section">
              <TradeLog
                trades={trades}
                currentPrice={data.price}
                onAdd={addTrade}
                onRemove={removeTrade}
                onClearAll={clearAll}
              />
            </section>

            <section className="future-section">
              <FutureModules />
            </section>
          </>
        ) : (
          <div className="error-state">
            <span>Unable to connect to market data</span>
            {error && <span className="error-detail">{error}</span>}
            <button onClick={refresh}>Retry</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
