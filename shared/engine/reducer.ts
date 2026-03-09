import { GameState } from '../types/state';
import { GameAction } from '../types/action';
import { getActionHandler } from './action-registry';

// Import all traits to trigger registration
import '../traits/index';

// Import all handlers to trigger registration
import './handlers/scout';
import './handlers/safe-recruit';
import './handlers/risky-recruit';
import './handlers/skip-actions';
import './handlers/proceed-to-forming';
import './handlers/discard-card';
import './handlers/toggle-select';
import './handlers/form-group-improve';
import './handlers/form-group-raise';
import './handlers/skip-forming';
import './handlers/end-turn';
import './handlers/acknowledge-zaptie';
import './handlers/sofroniy-ability';
import './handlers/hadzhi-ability';
import './handlers/panayot-pick';
import './handlers/lyuben-choose';
import './handlers/pop-hariton-form';
import './handlers/dismiss-message';

export function gameReducer(state: GameState, action: GameAction): GameState {
  const handler = getActionHandler(action.type);
  if (!handler) return state;
  return handler(state, action);
}
