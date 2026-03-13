// Side-effect imports: register all handlers and traits
import './handlers';
import '../traits';

import { GameAction } from '../types/action';
import { GameState } from '../types/state';
import { getActionHandler } from './action-registry';

// Re-export for backward compatibility
export { getTraitGroupBonus } from '../traits/trait-registry';

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.phase === 'scoring' && action.type !== 'RESOLVE_DECISION') return state;
  if (state.pendingDecision && action.type !== 'RESOLVE_DECISION') return state;

  const handler = getActionHandler(action.type);
  if (!handler) return state;
  return handler(state, action);
}
