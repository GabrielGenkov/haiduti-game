import { Card } from './card';
import { Player } from './player';

export type GameLength = 'short' | 'medium' | 'long';
export type GamePhase = 'home' | 'setup' | 'playing' | 'scoring';
export type TurnStep = 'recruiting' | 'selection' | 'forming' | 'end';
export type ActionType = 'scout' | 'safe_recruit' | 'risky_recruit' | 'skip';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  field: Card[];
  fieldFaceUp: boolean[];
  usedCards: Card[];
  deckRotations: number;
  maxRotations: number;
  gameLength: GameLength;
  turnStep: TurnStep;
  actionsRemaining: number;
  actionsUsed: number;
  canFormGroup: boolean;
  selectedCards: string[];
  message: string;
  zaptieTrigger?: {
    wasSecret: boolean;
    isDefeated: boolean;
    zaptieCards: Card[];
    dyadoIlyoTriggered?: boolean;
    popHaritonTriggered?: boolean;
    petkoVoyTriggered?: boolean;
    fromRiskyRecruit?: boolean;
  };
  sofroniyAbilityUsed: boolean;
  hadzhiAbilityUsed: boolean;
  benkovskiApplied: boolean;
  panayotTrigger?: {
    beneficiaryPlayerIndex: number;
    defeatedPlayerIndex: number;
    availableCards: Card[];
  };
  popHaritonForming: boolean;
}
