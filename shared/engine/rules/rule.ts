import { GameState } from '../../types/state';
import { GameAction } from '../../types/action';
import { Effect } from '../effects/types';

export interface RuleContext {
  readonly state: GameState;
  readonly action: GameAction;
}

export interface Rule {
  readonly id: string;
  readonly priority: number;
  when(ctx: RuleContext): boolean;
  execute(ctx: RuleContext): Effect[];
}
