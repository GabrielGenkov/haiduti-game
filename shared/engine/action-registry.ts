import { GameState } from '../types/state';
import { GameAction } from '../types/action';

export type ActionHandler = (state: GameState, action: GameAction) => GameState;

const handlers = new Map<string, ActionHandler>();

export function registerAction(type: string, handler: ActionHandler): void {
  handlers.set(type, handler);
}

export function getActionHandler(type: string): ActionHandler | undefined {
  return handlers.get(type);
}
