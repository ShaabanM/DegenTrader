export function formatCurrency(value: number, currency: string = 'USD', decimals: number = 2): string {
  const symbols: Record<string, string> = { GBP: '\u00a3', USD: '$', EUR: '\u20ac' }
  const symbol = symbols[currency] || currency + ' '
  const sign = value < 0 ? '-' : ''
  return `${sign}${symbol}${Math.abs(value).toFixed(decimals)}`
}

export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals: number = 0): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(decimals)
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}
