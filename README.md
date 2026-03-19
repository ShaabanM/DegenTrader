# DegenTrader - VWRA Trading Dashboard

A dark terminal-aesthetic trading dashboard for day trading **VWRA** (Vanguard FTSE All-World UCITS ETF, USD Accumulating) on the **London Stock Exchange** via **Interactive Brokers (IBKR)**.

Live at: `https://shaabanm.github.io/DegenTrader/`

## Quick Start

```bash
npm install --legacy-peer-deps
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview production build
```

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **vite-plugin-pwa** for installable PWA (service worker, offline shell)
- No component library - all custom CSS with CSS variables
- No state management library - React hooks only
- No charting library - custom SVG chart in `PriceChart.tsx`

## Project Structure

```
src/
  App.tsx                    # Root layout, data fetching orchestration, error/loading states
  App.css                    # All styles (single file, CSS variables for theming)
  main.tsx                   # Entry point
  index.css                  # CSS reset and base styles

  types/
    market.ts                # TypeScript interfaces: MarketData, PricePoint, TradeSimulation,
                             # SentimentSignal, AlgoSignal (future phase types included)

  services/
    marketData.ts            # Yahoo Finance v8 chart API integration (see "Market Data" below)

  hooks/
    useMarketData.ts         # useMarketData() - polls every 30s, returns {data, loading, error}
                             # usePriceHistory() - fetches OHLCV for selected range

  utils/
    format.ts                # formatCurrency (defaults USD), formatPercent, formatNumber, formatTime, formatDate
    fees.ts                  # IBKR tiered fee calculator + trade simulator (see "Fee Model" below)

  components/
    Header.tsx               # App header with refresh button and last-updated timestamp
    PriceCard.tsx             # Current price, daily change, day range bar
    MarketStats.tsx           # Open, prev close, volume, 52-week range, NAV, expense ratio
    PriceChart.tsx            # Custom SVG line chart with range selector (1d/5d/1mo/3mo/6mo/1y)
    TradeSimulator.tsx        # Interactive trade P&L simulator with IBKR fee breakdown
    FutureModules.tsx         # Placeholder cards for Phase 2/3 features

.github/workflows/
  deploy.yml                 # GitHub Pages deployment via GitHub Actions
```

## Key Design Decisions

### Market Data

- **Source**: Yahoo Finance v8 chart API (`/v8/finance/chart/VWRA.L`)
- The **quote endpoint** (`/v8/finance/quote`) requires authentication and does NOT work. Do not use it.
- The chart endpoint returns both `meta` (current price, 52-week range, etc.) and OHLCV history in one call
- **CORS handling**: tries direct fetch first, falls back to `corsproxy.io` proxy for browser environments
- **No fallback/fake data**: if the API is unreachable, the app shows an error state with retry button. This is intentional - we never display made-up numbers.
- `avgVolume` is hardcoded (55000) because the chart meta doesn't include it
- `marketCap` returns 0 from chart meta - would need a different data source

### Currency

- **VWRA trades in USD on LSE**. All prices, fees, and calculations are in USD.
- The `formatCurrency()` default is `'USD'` (displays `$`)
- The IBKR account is assumed to be USD-denominated
- FX conversion toggle exists in the simulator but defaults to OFF

### Fee Model (`src/utils/fees.ts`)

IBKR **Tiered** pricing for European-listed stocks:

| Fee | Rate | Notes |
|-----|------|-------|
| Commission | 0.05% of trade value | Min EUR 1.25, Max EUR 29, converted to USD at 1.08 |
| LSE Exchange Fee | 0.0045% | |
| Clearing Fee | 0.0001% | |
| FX Spread | 0.002% | Only if converting from non-USD currency |
| Stamp Duty | 0% | ETFs are exempt (only applies to individual UK shares) |
| PTM Levy | 0% | Abolished 2021 |

**Break-even calculation**: uses iterative convergence (20 iterations) because sell-side fees depend on the sell value, which depends on the break-even price itself. The iteration converges in ~3-5 steps for all practical trade sizes.

**Shares**: always rounded down (floor) since LSE does not support fractional shares.

## GitHub Pages Deployment

### Current Issue (UNRESOLVED)

The GitHub Actions workflow (`.github/workflows/deploy.yml`) is configured to trigger on push to any branch (`branches: ['*']`), but **GitHub only reads workflow files from the repository's default branch**. The repo currently has no `main` branch - only `claude/vwra-trading-dashboard-0uLq1`.

**To fix this, the repo owner must do ONE of the following:**

1. **Set the default branch** to `claude/vwra-trading-dashboard-0uLq1` in GitHub repo Settings > General > Default Branch
2. **Or merge the branch into `main`** and ensure GitHub Pages source is set to "GitHub Actions" in Settings > Pages

After either fix, every subsequent push will auto-build and deploy.

### Workflow Details

- Triggers: push (any branch), pull_request (to main), workflow_dispatch (manual)
- Builds with Node 20, runs `npm ci --legacy-peer-deps && npm run build`
- Deploys `dist/` via `actions/deploy-pages@v4`
- Base path is `/DegenTrader/` (configured in `vite.config.ts`)

## Phase Roadmap

### Phase 1 (CURRENT - Complete)
- [x] Live VWRA market data from Yahoo Finance
- [x] Price chart with multiple timeframes (1d to 1y)
- [x] Market stats (open, close, 52-week range, volume, NAV, TER)
- [x] IBKR trade fee simulator with accurate tiered pricing
- [x] Break-even price calculator
- [x] Dark terminal aesthetic
- [x] PWA support (installable, offline shell)
- [x] GitHub Pages deployment workflow

### Phase 2 (Next)
- [ ] **AI Sentiment Analysis** - LLM-powered analysis of financial news, central bank statements, social media for VWRA-relevant signals (uses `SentimentSignal` type already defined in `types/market.ts`)
- [ ] **Portfolio Tracker** - Track actual IBKR positions, P&L history, cumulative fee impact
- [ ] **T-Bill Monitor** - Irish-domiciled T-Bill ETF tracking for cash parking strategy

### Phase 3 (Future)
- [ ] **Algorithmic Signals** - Technical analysis with momentum, mean-reversion, and volatility strategies (uses `AlgoSignal` type already defined in `types/market.ts`)
- [ ] **WebSocket real-time feeds** - Replace polling with live data
- [ ] **News/sentiment API integration**

## Known Issues and Gotchas

1. **corsproxy.io dependency**: the CORS proxy is a third-party service that could go down or rate-limit. A backend proxy would be more reliable for production use.
2. **Yahoo Finance API stability**: Yahoo has historically deprecated and changed their finance APIs without notice. The v8 chart endpoint works as of March 2026 but may break.
3. **No tests**: there are currently no unit or integration tests. The fee calculator (`fees.ts`) is the most critical piece to test - edge cases around min/max commission thresholds and the break-even iteration.
4. **`PriceChart.tsx` receives `currentPrice` prop but doesn't use it** (aliased to `_currentPrice`). Can be cleaned up.
5. **`TradeSimulation` interface in `types/market.ts`** has fields (`stampDuty`, `buyCommission`, `sellCommission`) that don't match the actual `simulateTrade()` return type. The function returns `buyFees`/`sellFees` as `FeeBreakdown` objects instead. The interface should be updated or removed.

## Environment Notes

- Built and tested with Node 20
- Uses `--legacy-peer-deps` for npm install (React 19 peer dep conflicts)
- Vite base path set to `/DegenTrader/` for GitHub Pages subdirectory hosting
