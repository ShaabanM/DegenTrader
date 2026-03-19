/**
 * IBKR Fee Calculator for LSE-listed ETFs (VWRA)
 *
 * IBKR Tiered pricing for European stocks:
 * - Commission: 0.05% of trade value, min EUR 1.25, max EUR 29
 * - Exchange fee (LSE): 0.0045% (approx)
 * - Clearing fee: 0.0001%
 * - Transaction reporting: GBP 0.00
 *
 * For GBP-denominated ETFs bought with USD:
 * - FX conversion spread: ~0.002% (2 basis points) via IBKR
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

// Approximate EUR/GBP for commission conversion
const EUR_TO_GBP = 0.86

export function calculateTradeFees(
  tradeValueGBP: number,
  needsFxConversion: boolean = true
): FeeBreakdown {
  // Commission (calculated in EUR, converted to GBP)
  const commissionEUR = Math.min(
    Math.max(tradeValueGBP / EUR_TO_GBP * IBKR_COMMISSION_RATE, IBKR_MIN_COMMISSION_EUR),
    IBKR_MAX_COMMISSION_EUR
  )
  const commission = commissionEUR * EUR_TO_GBP

  // Exchange fee
  const exchangeFee = tradeValueGBP * LSE_EXCHANGE_FEE_RATE

  // Clearing fee
  const clearingFee = tradeValueGBP * CLEARING_FEE_RATE

  // FX conversion cost (if converting from USD/EUR to GBP)
  const fxCost = needsFxConversion ? tradeValueGBP * FX_SPREAD_RATE : 0

  return {
    commission,
    exchangeFee,
    clearingFee,
    fxCost,
    totalFees: commission + exchangeFee + clearingFee + fxCost,
  }
}

export function simulateTrade(
  investmentAmountGBP: number,
  buyPriceGBP: number,
  sellPriceGBP: number,
  needsFxConversion: boolean = true
) {
  // Calculate shares (fractional not supported on LSE, round down)
  const buyFees = calculateTradeFees(investmentAmountGBP, needsFxConversion)
  const effectiveInvestment = investmentAmountGBP - buyFees.totalFees
  const shares = Math.floor(effectiveInvestment / buyPriceGBP)
  const actualCost = shares * buyPriceGBP

  // Sell side
  const sellValue = shares * sellPriceGBP
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
    investmentAmount: investmentAmountGBP,
    buyPrice: buyPriceGBP,
    sellPrice: sellPriceGBP,
    shares,
    actualCost,
    unusedCash: investmentAmountGBP - actualCost - buyFees.totalFees,
    grossProfit,
    buyFees,
    sellFees,
    totalFees,
    netProfit,
    returnPct,
    breakEvenPrice,
  }
}
