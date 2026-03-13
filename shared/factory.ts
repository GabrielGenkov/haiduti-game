import { GameState, GameLength } from './types/state';
import { Player } from './types/player';
import { ALL_CARDS } from './constants/cards';
import { shuffle } from './utils/shuffle';
import { getMaxRotations } from './utils/stats';

export function createInitialGameState(
  playerNames: string[],
  gameLength: GameLength
): GameState {
  const regularCards = ALL_CARDS.filter(card => !card.silverDiamond && !card.goldDiamond);
  const deck = shuffle(regularCards);
  const field = deck.splice(0, 16);

  const players: Player[] = playerNames.map((name, index) => ({
    id: `player_${index}`,
    name,
    stats: { nabor: 4, deynost: 4, boyna: 4 },
    isRevealed: false,
    hand: [],
    raisedVoyvodas: [],
    raisedDeytsi: [],
    traits: [],
    zaptieTurnIgnored: false,
    dyadoIlyoActive: false,
    lyubenStatChoice: undefined,
  }));

  return {
    phase: 'playing',
    ruleset: 'official',
    players,
    currentPlayerIndex: 0,
    deck,
    field,
    fieldFaceUp: new Array(field.length).fill(false),
    sideField: [],
    sideFieldFaceUp: [],
    usedCards: [],
    deckRotations: 0,
    maxRotations: getMaxRotations(gameLength),
    gameLength,
    turnStep: 'recruiting',
    actionsRemaining: players[0].stats.deynost,
    actionsUsed: 0,
    canFormGroup: true,
    selectedCards: [],
    message: `${players[0].name} започва играта!`,
    notifications: [
      {
        id: 'game-start',
        kind: 'info',
        text: `${players[0].name} започва играта!`,
      },
    ],
    pendingDecision: undefined,
    pendingGroup: undefined,
    defeatContext: undefined,
    zaptieTrigger: undefined,
    panayotTrigger: undefined,
    popHaritonForming: false,
    sofroniyAbilityUsed: false,
    hadzhiAbilityUsed: false,
    benkovskiApplied: false,
    deckExhausted: false,
    gameEndsAfterTurn: false,
  };
}
