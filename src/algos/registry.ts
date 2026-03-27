import type { Algorithm } from '../types/market'
import { oilVwraMomentum } from './oilVwraMomentum'
import { meanReversion } from './meanReversion'
import { rsiSignal } from './rsiSignal'
import { oilLeadLag } from './oilLeadLag'
import { volatilityBreakout } from './volatilityBreakout'

export const algorithms: Algorithm[] = [
  oilVwraMomentum,
  meanReversion,
  rsiSignal,
  oilLeadLag,
  volatilityBreakout,
]
