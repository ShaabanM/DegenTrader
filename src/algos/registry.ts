import type { Algorithm } from '../types/market'
import { oilVwraMomentum } from './oilVwraMomentum'
import { meanReversion } from './meanReversion'
import { rsiSignal } from './rsiSignal'
import { oilLeadLag } from './oilLeadLag'
import { volatilityBreakout } from './volatilityBreakout'

export const algorithms: Algorithm[] = [
  meanReversion,
  rsiSignal,
  oilVwraMomentum,
  volatilityBreakout,
  oilLeadLag,
]
