import { GameState, GameLength } from './types/state';
import { Player } from './types/player';
import { ALL_CARDS } from './constants/cards';
import { shuffle } from './utils/shuffle';
import { getMaxRotations } from './utils/stats';

export function createInitialGameState(
  playerNames: string[],
  gameLength: GameLength
): GameState {
  const regularCards = ALL_CARDS.filter(c => !c.silverDiamond && !c.goldDiamond);
  const usedCards: typeof regularCards = [];
  const deck = shuffle(regularCards);
  const field = deck.splice(0, 16);
  const fieldFaceUp = new Array(16).fill(false);

  const players: Player[] = playerNames.map((name, i) => ({
    id: `player_${i}`,
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
    players,
    currentPlayerIndex: 0,
    deck,
    field,
    fieldFaceUp,
    usedCards,
    deckRotations: 0,
    maxRotations: getMaxRotations(gameLength),
    gameLength,
    turnStep: 'recruiting',
    actionsRemaining: players[0].stats.deynost,
    actionsUsed: 0,
    canFormGroup: true,
    selectedCards: [],
    message: `${players[0].name} започва играта!`,
    zaptieTrigger: undefined,
    sofroniyAbilityUsed: false,
    hadzhiAbilityUsed: false,
    benkovskiApplied: false,
    panayotTrigger: undefined,
    popHaritonForming: false,
  };
}
