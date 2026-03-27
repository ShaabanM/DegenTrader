import { useMemo } from 'react'
import type { PricePoint } from '../types/market'
import { formatDate, formatPercent } from '../utils/format'

interface PriceChartProps {
  vwraHistory: PricePoint[]
  oilHistory: PricePoint[]
  loading: boolean
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'
  onRangeChange: (range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y') => void
}

const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y'] as const

function normalizeSeries(series: PricePoint[]): number[] {
  if (series.length === 0) return []
  const base = series[0].close || 1
  return series.map(point => (point.close / base) * 100)
}

export function PriceChart({ vwraHistory, oilHistory, loading, range, onRangeChange }: PriceChartProps) {
  const chart = useMemo(() => {
    const oilMap = new Map(oilHistory.map(point => [point.date, point]))
    const points = vwraHistory
      .map(point => ({
        date: point.date,
        vwra: point,
        oil: oilMap.get(point.date),
      }))
      .filter((point): point is { date: string; vwra: PricePoint; oil: PricePoint } => point.oil !== undefined)

    if (points.length < 2) return null

    const normalizedVwra = normalizeSeries(points.map(point => point.vwra))
    const normalizedOil = normalizeSeries(points.map(point => point.oil))
    const values = [...normalizedVwra, ...normalizedOil]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1

    const toPath = (series: number[]) => series
      .map((value, index) => {
        const x = (index / (series.length - 1)) * 100
        const y = 100 - ((value - min) / span) * 100
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    return {
      points,
      vwraPath: toPath(normalizedVwra),
      oilPath: toPath(normalizedOil),
      vwraReturn: normalizedVwra[normalizedVwra.length - 1] - 100,
      oilReturn: normalizedOil[normalizedOil.length - 1] - 100,
    }
  }, [oilHistory, vwraHistory])

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Relationship chart</span>
          <h2>VWRA vs Brent, normalized</h2>
        </div>
        <div className="range-selector">
          {RANGES.map(value => (
            <button
              key={value}
              className={`range-btn ${value === range ? 'active' : ''}`}
              onClick={() => onRangeChange(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading || !chart ? (
        <div className="chart-empty">Loading overlay chart...</div>
      ) : (
        <>
          <div className="chart-legend">
            <span className="legend-item legend-vwra">VWRA {formatPercent(chart.vwraReturn)}</span>
            <span className="legend-item legend-oil">Brent {formatPercent(chart.oilReturn)}</span>
          </div>

          <div className="overlay-chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="VWRA versus Brent normalized chart">
              <path d={chart.oilPath} className="chart-line oil" />
              <path d={chart.vwraPath} className="chart-line vwra" />
            </svg>
          </div>

          <div className="chart-dates">
            <span>{formatDate(chart.points[0].date)}</span>
            <span>{formatDate(chart.points[chart.points.length - 1].date)}</span>
          </div>
        </>
      )}
    </section>
  )
}
