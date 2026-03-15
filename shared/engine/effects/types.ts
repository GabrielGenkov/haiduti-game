import { Card, ContributionType, DeyetsTraitId } from '../../types/card';
import { Player } from '../../types/player';
import { GameState, PendingDecision, PendingGroupContext, DefeatContext } from '../../types/state';

// ── Zone References ──────────────────────────────────────────

export type ZoneRef =
  | { zone: 'deck' }
  | { zone: 'field' }
  | { zone: 'sideField' }
  | { zone: 'usedCards' }
  | { zone: 'hand'; playerIndex: number }
  | { zone: 'raisedVoyvodas'; playerIndex: number }
  | { zone: 'raisedDeytsi'; playerIndex: number };

// ── Effect Primitives ────────────────────────────────────────

export interface MoveCardsEffect {
  type: 'MOVE_CARDS';
  cardIds: string[];
  from: ZoneRef;
  to: ZoneRef;
  position?: 'start' | 'end';
}

export interface SetFieldVisibilityEffect {
  type: 'SET_FIELD_VISIBILITY';
  fieldZone: 'field' | 'sideField';
  indices: number[] | 'all';
  visible: boolean;
}

export interface SetStatEffect {
  type: 'SET_STAT';
  playerIndex: number;
  stat: ContributionType;
  value: number;
}

export interface UpdatePlayerEffect {
  type: 'UPDATE_PLAYER';
  playerIndex: number;
  updates: Partial<Pick<Player,
    'isRevealed' | 'zaptieTurnIgnored' | 'dyadoIlyoActive' | 'lyubenStatChoice' | 'hand'
  >>;
}

export interface AddTraitsEffect {
  type: 'ADD_TRAITS';
  playerIndex: number;
  traitIds: DeyetsTraitId[];
}

export interface SetTurnFlowEffect {
  type: 'SET_TURN_FLOW';
  updates: Partial<Pick<GameState,
    'turnStep' | 'actionsRemaining' | 'actionsUsed' | 'canFormGroup' |
    'selectedCards' | 'currentPlayerIndex' | 'phase' | 'deckRotations' |
    'sofroniyAbilityUsed' | 'hadzhiAbilityUsed' | 'benkovskiApplied' |
    'popHaritonForming' | 'deckExhausted' | 'gameEndsAfterTurn'
  >>;
}

export interface SetMessageEffect {
  type: 'SET_MESSAGE';
  message: string;
}

export interface PushNotificationEffect {
  type: 'PUSH_NOTIFICATION';
  text: string;
  kind: 'info' | 'warning' | 'error' | 'success';
}

export interface SetDecisionEffect {
  type: 'SET_DECISION';
  decision: PendingDecision | undefined;
}

export interface SetPendingGroupEffect {
  type: 'SET_PENDING_GROUP';
  pendingGroup: PendingGroupContext | undefined;
}

export interface SetZaptieTriggerEffect {
  type: 'SET_ZAPTIE_TRIGGER';
  zaptieTrigger: GameState['zaptieTrigger'];
}

export interface SetPanayotTriggerEffect {
  type: 'SET_PANAYOT_TRIGGER';
  panayotTrigger: GameState['panayotTrigger'];
}

export interface SetDefeatContextEffect {
  type: 'SET_DEFEAT_CONTEXT';
  defeatContext: DefeatContext | undefined;
}

export interface ReplaceDeckEffect {
  type: 'REPLACE_DECK';
  newDeck: Card[];
  clearUsedCards: boolean;
}

export type Effect =
  | MoveCardsEffect
  | SetFieldVisibilityEffect
  | SetStatEffect
  | UpdatePlayerEffect
  | AddTraitsEffect
  | SetTurnFlowEffect
  | SetMessageEffect
  | PushNotificationEffect
  | SetDecisionEffect
  | SetPendingGroupEffect
  | SetZaptieTriggerEffect
  | SetPanayotTriggerEffect
  | SetDefeatContextEffect
  | ReplaceDeckEffect;
