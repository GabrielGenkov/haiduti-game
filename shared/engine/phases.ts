import { GameState } from '../types/state';
import { GameAction } from '../types/action';

/**
 * LogicalPhase — the single derived game phase computed from GameState fields.
 * Determines allowed transitions and commands at any point in the game.
 *
 * Derivation priority: pendingDecision > zaptieTrigger > panayotTrigger > popHaritonForming > turnStep
 */
export type LogicalPhase =
  // Game lifecycle
  | 'home'
  | 'setup'
  | 'scoring'
  // Normal turn flow
  | 'recruiting'
  | 'selection'
  | 'forming'
  | 'turn_end'
  // Interrupt phases
  | 'interrupt:zaptie'
  | 'interrupt:trait_choice'
  | 'interrupt:panayot'
  | 'interrupt:defeat_forming'
  // Decision phases
  | 'decision:rakowski_keep'
  | 'decision:petko_keep'
  | 'decision:panayot_take'
  | 'decision:contribution_choice'
  | 'decision:stat_choice'
  | 'decision:acknowledge';

type ActionType = GameAction['type'];

/**
 * Map from LogicalPhase to the set of command types accepted in that phase.
 */
export const ALLOWED_COMMANDS: Record<LogicalPhase, readonly ActionType[]> = {
  home: [],
  setup: [],
  scoring: ['RESOLVE_DECISION'],

  recruiting: [
    'SCOUT', 'SAFE_RECRUIT', 'RISKY_RECRUIT', 'SKIP_ACTIONS',
    'USE_SOFRONIY_ABILITY', 'USE_HADZHI_ABILITY',
    'LYUBEN_CHOOSE_STAT',
    'DISMISS_MESSAGE',
  ],
  selection: [
    'DISCARD_CARD', 'CONFIRM_DISCARDS', 'PROCEED_TO_FORMING', 'SKIP_FORMING',
    'DISMISS_MESSAGE',
  ],
  forming: [
    'TOGGLE_SELECT_CARD', 'FORM_GROUP_IMPROVE_STAT', 'FORM_GROUP_RAISE_CARD',
    'SKIP_FORMING', 'END_TURN',
    'DISMISS_MESSAGE',
  ],
  turn_end: [
    'END_TURN',
    'DISMISS_MESSAGE',
  ],

  'interrupt:zaptie': [
    'ACKNOWLEDGE_ZAPTIE',
    'DISMISS_MESSAGE',
  ],
  'interrupt:trait_choice': [
    'RESOLVE_DECISION',
    'DISMISS_MESSAGE',
  ],
  'interrupt:panayot': [
    'PANAYOT_PICK_CARD', 'PANAYOT_SKIP',
    'DISMISS_MESSAGE',
  ],
  'interrupt:defeat_forming': [
    'TOGGLE_SELECT_CARD',
    'POP_HARITON_FORM_GROUP', 'POP_HARITON_SKIP',
    'END_TURN',
    'DISMISS_MESSAGE',
  ],

  'decision:rakowski_keep': ['RESOLVE_DECISION', 'DISMISS_MESSAGE'],
  'decision:petko_keep': ['RESOLVE_DECISION', 'DISMISS_MESSAGE'],
  'decision:panayot_take': ['RESOLVE_DECISION', 'DISMISS_MESSAGE'],
  'decision:contribution_choice': ['RESOLVE_DECISION', 'DISMISS_MESSAGE'],
  'decision:stat_choice': ['RESOLVE_DECISION', 'DISMISS_MESSAGE'],
  'decision:acknowledge': ['RESOLVE_DECISION', 'DISMISS_MESSAGE'],
};

/**
 * Derive the logical phase from the current GameState.
 * Priority: pendingDecision > zaptieTrigger > panayotTrigger > popHaritonForming > turnStep
 */
export function derivePhase(state: GameState): LogicalPhase {
  // Game lifecycle takes precedence (except scoring with pending decision)
  if (state.phase === 'home') return 'home';
  if (state.phase === 'setup') return 'setup';
  if (state.phase === 'scoring' && !state.pendingDecision) return 'scoring';

  // Decisions block everything else
  if (state.pendingDecision) {
    switch (state.pendingDecision.kind) {
      case 'trait_choice':
        return 'interrupt:trait_choice';
      case 'card_choice': {
        const purpose = (state.pendingDecision as { purpose: string }).purpose;
        if (purpose === 'rakowski_keep') return 'decision:rakowski_keep';
        if (purpose === 'petko_keep') return 'decision:petko_keep';
        if (purpose === 'panayot_take') return 'decision:panayot_take';
        break;
      }
      case 'contribution_choice':
        return 'decision:contribution_choice';
      case 'stat_choice':
        return 'decision:stat_choice';
      case 'acknowledge':
        return 'decision:acknowledge';
    }
  }

  // Zaptie interrupt
  if (state.zaptieTrigger) return 'interrupt:zaptie';

  // Panayot interrupt
  if (state.panayotTrigger) return 'interrupt:panayot';

  // Pop Hariton defeat forming
  if (state.popHaritonForming) return 'interrupt:defeat_forming';

  // Normal turn flow
  switch (state.turnStep) {
    case 'start':
    case 'recruiting':
      return 'recruiting';
    case 'selection':
      return 'selection';
    case 'forming':
      return 'forming';
    case 'end':
      return 'turn_end';
  }
}

/**
 * Check if a command type is allowed in the current phase.
 */
export function isCommandAllowed(state: GameState, actionType: ActionType): boolean {
  const phase = derivePhase(state);
  return ALLOWED_COMMANDS[phase].includes(actionType);
}
