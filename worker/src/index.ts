/**
 * Cloudflare Worker: CORS proxy for Yahoo Finance API
 * Proxies requests to Yahoo Finance chart API and adds CORS headers.
 */

const YAHOO_BASE = 'https://query2.finance.yahoo.com'
const ALLOWED_PATHS = ['/v8/finance/chart/']

// Allow requests from any origin (this is public market data)
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405)
    }

    const url = new URL(request.url)
    const path = url.pathname

    // Health check
    if (path === '/' || path === '/health') {
      return json({ status: 'ok', service: 'degentrader-api' })
    }

    // Validate the path is an allowed Yahoo Finance endpoint
    if (!ALLOWED_PATHS.some(p => path.startsWith(p))) {
      return jsonError('Not found', 404)
    }

    // Proxy to Yahoo Finance
    const yahooUrl = `${YAHOO_BASE}${path}${url.search}`

    try {
      const resp = await fetch(yahooUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DegenTrader/1.0)',
        },
      })

      if (!resp.ok) {
        return jsonError(`Yahoo Finance returned ${resp.status}`, resp.status)
      }

      const data = await resp.text()

      return new Response(data, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
        },
      })
    } catch (err) {
      return jsonError(`Upstream error: ${(err as Error).message}`, 502)
    }
  },
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status)
}
