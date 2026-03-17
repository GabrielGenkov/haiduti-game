import { GameState } from "@shared/types";
import { GameAction } from "@shared/types";
import { applyEffects } from "@shared/engine/effects";
import { getAllRules } from './rule-registry';

export function dispatchAction(state: GameState, action: GameAction): GameState {
  const ctx = { state, action };
  const winner = getAllRules().find(r => r.when(ctx));
  if (!winner) return state;
  const effects = winner.execute(ctx);
  if (effects.length === 0) return state;
  return applyEffects(state, effects);
}
