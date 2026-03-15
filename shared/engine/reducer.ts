// Side-effect import: register all rules
import './rules';

import { GameAction } from '../types/action';
import { GameState } from '../types/state';
import { dispatchAction } from './rules/rule-dispatcher';

// Re-export for backward compatibility (frontend uses this)
export { getTraitGroupBonusFromTable as getTraitGroupBonus } from './rule-tables';

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.phase === 'scoring' && action.type !== 'RESOLVE_DECISION') return state;
  if (state.pendingDecision && action.type !== 'RESOLVE_DECISION') return state;

  return dispatchAction(state, action);
}
