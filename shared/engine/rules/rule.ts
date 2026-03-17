import { GameState } from "@shared/types";
import { GameAction } from "@shared/types";
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
