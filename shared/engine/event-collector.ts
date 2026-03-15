import { DomainEvent, DomainEventBase } from '../types/event';

// Distributive Omit that works across union members
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type PartialEvent = DistributiveOmit<DomainEvent, keyof DomainEventBase>;

interface CollectorFrame {
  events: PartialEvent[];
  playerIndex: number;
}

const stack: CollectorFrame[] = [];

/**
 * Called by handlers/helpers to emit a domain event.
 * Only the domain-specific fields are required; base fields
 * (revision, index, playerIndex, timestamp) are filled in by collectEvents().
 *
 * If no collector is active (e.g., golden tests calling gameReducer directly),
 * the call is a no-op. This is the key safety property.
 */
export function emitEvent(partial: PartialEvent): void {
  const frame = stack[stack.length - 1];
  if (!frame) return;
  frame.events.push(partial);
}

/**
 * Wraps a synchronous function, collecting all events emitted during its execution.
 * Returns the function's result and the collected events (with base fields filled in).
 */
export function collectEvents<T>(
  playerIndex: number,
  revision: number,
  fn: () => T,
): { result: T; events: DomainEvent[] } {
  const frame: CollectorFrame = { events: [], playerIndex };
  stack.push(frame);
  try {
    const result = fn();
    const timestamp = new Date().toISOString();
    const events: DomainEvent[] = frame.events.map((partial, index) => ({
      ...partial,
      revision,
      index,
      playerIndex,
      timestamp,
    } as DomainEvent));
    return { result, events };
  } finally {
    stack.pop();
  }
}

/**
 * Returns true if an event collector is currently active.
 */
export function isCollecting(): boolean {
  return stack.length > 0;
}
