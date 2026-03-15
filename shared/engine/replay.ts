import { GameState } from '../types/state';
import { Command } from '../types/command';
import { DomainEvent } from '../types/event';
import { applyCommand } from './command-handler';

export interface ReplayResult {
  finalState: GameState;
  allEvents: DomainEvent[];
  commandCount: number;
  failedAt?: { index: number; commandId: string; reason: string };
}

/**
 * Replays a sequence of commands starting from an initial state.
 * Collects all domain events. Stops at first rejection.
 */
export function replayCommands(
  initialState: GameState,
  commands: Command[],
): ReplayResult {
  let state = initialState;
  const allEvents: DomainEvent[] = [];

  for (let i = 0; i < commands.length; i++) {
    const result = applyCommand(state, commands[i]);
    if (!result.ok) {
      return {
        finalState: state,
        allEvents,
        commandCount: i,
        failedAt: {
          index: i,
          commandId: result.rejection.commandId,
          reason: result.rejection.message,
        },
      };
    }
    state = result.newState;
    allEvents.push(...result.events);
  }

  return { finalState: state, allEvents, commandCount: commands.length };
}
