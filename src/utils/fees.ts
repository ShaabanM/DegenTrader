/**
 * IBKR Fee Calculator for LSE-listed ETFs (VWRA)
 *
 * IBKR Tiered pricing for European stocks:
 * - Commission: 0.05% of trade value, min EUR 1.25, max EUR 29
 * - Exchange fee (LSE): 0.0045% (approx)
 * - Clearing fee: 0.0001%
 * - Transaction reporting: USD 0.00
 *
 * VWRA trades in USD on LSE. No FX conversion needed if account is USD.
 * FX conversion only if funding from non-USD currency.
 *
 * No stamp duty on ETFs (only on individual UK shares)
 * No PTM levy abolished 2021
 */

export interface FeeBreakdown {
  commission: number
  exchangeFee: number
  clearingFee: number
  fxCost: number
  totalFees: number
}

const IBKR_COMMISSION_RATE = 0.0005 // 0.05%
const IBKR_MIN_COMMISSION_EUR = 1.25
const IBKR_MAX_COMMISSION_EUR = 29.0
const LSE_EXCHANGE_FEE_RATE = 0.000045 // 0.0045%
const CLEARING_FEE_RATE = 0.000001 // 0.0001%
const FX_SPREAD_RATE = 0.00002 // 0.002% (IBKR's tight FX spread)

// Approximate EUR/USD for commission conversion
const EUR_TO_USD = 1.08

export function calculateTradeFees(
  tradeValueUSD: number,
  needsFxConversion: boolean = false
): FeeBreakdown {
  // Commission (calculated in EUR, converted to USD)
  const commissionEUR = Math.min(
    Math.max(tradeValueUSD / EUR_TO_USD * IBKR_COMMISSION_RATE, IBKR_MIN_COMMISSION_EUR),
    IBKR_MAX_COMMISSION_EUR
  )
  const commission = commissionEUR * EUR_TO_USD

  // Exchange fee
  const exchangeFee = tradeValueUSD * LSE_EXCHANGE_FEE_RATE

  // Clearing fee
  const clearingFee = tradeValueUSD * CLEARING_FEE_RATE

  // FX conversion cost (only if converting from non-USD currency)
  const fxCost = needsFxConversion ? tradeValueUSD * FX_SPREAD_RATE : 0

  return {
    commission,
    exchangeFee,
    clearingFee,
    fxCost,
    totalFees: commission + exchangeFee + clearingFee + fxCost,
  }
}

export function simulateTrade(
  investmentAmountUSD: number,
  buyPriceUSD: number,
  sellPriceUSD: number,
  needsFxConversion: boolean = false
) {
  // Calculate shares (fractional not supported on LSE, round down)
  const buyFees = calculateTradeFees(investmentAmountUSD, needsFxConversion)
  const effectiveInvestment = investmentAmountUSD - buyFees.totalFees
  const shares = Math.floor(effectiveInvestment / buyPriceUSD)
  const actualCost = shares * buyPriceUSD

  // Sell side
  const sellValue = shares * sellPriceUSD
  const sellFees = calculateTradeFees(sellValue, needsFxConversion)

  const grossProfit = sellValue - actualCost
  const totalFees = buyFees.totalFees + sellFees.totalFees
  const netProfit = grossProfit - totalFees
  const returnPct = actualCost > 0 ? (netProfit / actualCost) * 100 : 0

  // Break-even: price where net profit = 0
  // sellPrice * shares - sellFees - actualCost - buyFees = 0
  // Approximate break-even (ignoring sell fee variation)
  const breakEvenPrice = actualCost > 0
    ? (actualCost + buyFees.totalFees + sellFees.totalFees) / shares
    : 0

  return {
    investmentAmount: investmentAmountUSD,
    buyPrice: buyPriceUSD,
    sellPrice: sellPriceUSD,
    shares,
    actualCost,
    unusedCash: investmentAmountUSD - actualCost - buyFees.totalFees,
    grossProfit,
    buyFees,
    sellFees,
    totalFees,
    netProfit,
    returnPct,
    breakEvenPrice,
  }
}
