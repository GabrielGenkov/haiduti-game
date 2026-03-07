// ============================================================
// ХАЙДУТИ — Game Data & Types
// Design: Хайдушка чета board-game aesthetic
// ============================================================

export type CardColor = 'green' | 'blue' | 'red' | 'yellow';
export type ContributionType = 'nabor' | 'deynost' | 'boyna';
export type CardType = 'haydut' | 'voyvoda' | 'deyets' | 'zaptie';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  color?: CardColor;
  strength?: number;
  contribution?: ContributionType;
  cost?: number;
  chetaPoints?: number;
  effect?: string;
  groupBonus?: string;
  // special diamond markers
  silverDiamond?: boolean; // enters on 1st reshuffle
  goldDiamond?: boolean;   // enters on 2nd reshuffle
}

export interface PlayerStats {
  nabor: number;   // hand size (4-10)
  deynost: number; // actions per turn (4-10)
  boyna: number;   // combat power (4-10)
}

export interface Player {
  id: string;
  name: string;
  stats: PlayerStats;
  isRevealed: boolean; // false = secret (green), true = revealed (red)
  hand: Card[];
  raisedVoyvodas: Card[];
  raisedDeytsi: Card[];
}

export type GameLength = 'short' | 'medium' | 'long';
export type GamePhase = 'home' | 'setup' | 'playing' | 'scoring';
export type TurnStep = 'recruiting' | 'selection' | 'forming' | 'end';
export type ActionType = 'scout' | 'safe_recruit' | 'risky_recruit' | 'skip';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  field: Card[]; // 16 cards, face-down or face-up
  fieldFaceUp: boolean[]; // which field cards are face-up
  usedCards: Card[];
  deckRotations: number;
  maxRotations: number;
  gameLength: GameLength;
  turnStep: TurnStep;
  actionsRemaining: number;
  actionsUsed: number;
  canFormGroup: boolean;
  selectedCards: string[]; // card IDs selected for group
  message: string;
  zaptieTrigger?: {
    wasSecret: boolean;
    isDefeated: boolean;
    zaptieCards: Card[];
  };
}

// ============================================================
// STAT TRACK
// ============================================================
export const STAT_TRACK = [4, 5, 6, 7, 8, 9, 10];

// Cost to upgrade stat to each level (index = stat value - 4)
export const STAT_UPGRADE_COSTS: Record<number, number> = {
  5: 4,
  6: 8,
  7: 11,
  8: 13,
  9: 15,
  10: 17,
};

// ============================================================
// CARD DEFINITIONS
// ============================================================

// Hayduti cards: 4 colors × 6 types × 2 copies = 48 cards
function makeHayduti(color: CardColor, contribution: ContributionType, strength: 2 | 3, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `haydut_${color}_${contribution}_${strength}_${i}`,
    type: 'haydut' as CardType,
    name: 'Хайдутин',
    color,
    contribution,
    strength,
    cost: undefined,
    chetaPoints: undefined,
  }));
}

export const HAYDUTI_CARDS: Card[] = [
  // Green
  ...makeHayduti('green', 'nabor', 2, 2),
  ...makeHayduti('green', 'nabor', 3, 2),
  ...makeHayduti('green', 'deynost', 2, 2),
  ...makeHayduti('green', 'deynost', 3, 2),
  ...makeHayduti('green', 'boyna', 2, 2),
  ...makeHayduti('green', 'boyna', 3, 2),
  // Blue
  ...makeHayduti('blue', 'nabor', 2, 2),
  ...makeHayduti('blue', 'nabor', 3, 2),
  ...makeHayduti('blue', 'deynost', 2, 2),
  ...makeHayduti('blue', 'deynost', 3, 2),
  ...makeHayduti('blue', 'boyna', 2, 2),
  ...makeHayduti('blue', 'boyna', 3, 2),
  // Red
  ...makeHayduti('red', 'nabor', 2, 2),
  ...makeHayduti('red', 'nabor', 3, 2),
  ...makeHayduti('red', 'deynost', 2, 2),
  ...makeHayduti('red', 'deynost', 3, 2),
  ...makeHayduti('red', 'boyna', 2, 2),
  ...makeHayduti('red', 'boyna', 3, 2),
  // Yellow
  ...makeHayduti('yellow', 'nabor', 2, 2),
  ...makeHayduti('yellow', 'nabor', 3, 2),
  ...makeHayduti('yellow', 'deynost', 2, 2),
  ...makeHayduti('yellow', 'deynost', 3, 2),
  ...makeHayduti('yellow', 'boyna', 2, 2),
  ...makeHayduti('yellow', 'boyna', 3, 2),
];

// Voyvoda cards: 17 cards
// Per a.txt: 4×(cost4,pts2) regular + 5×(cost7,pts3) regular + 5×(cost10,pts5) silverDiamond + 3×(cost12,pts7) goldDiamond
export const VOYVODA_CARDS: Card[] = [
  // Regular — available in initial deck
  { id: 'voy_1', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_2', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_3', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_4', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_5', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_6', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_7', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_8', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_9', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  // Silver diamond — enter after rotation 1
  { id: 'voy_10', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_11', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_12', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_13', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_14', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  // Gold diamond — enter after rotation 2
  { id: 'voy_15', type: 'voyvoda', name: 'Войвода', cost: 12, chetaPoints: 7, goldDiamond: true },
  { id: 'voy_16', type: 'voyvoda', name: 'Войвода', cost: 12, chetaPoints: 7, goldDiamond: true },
  { id: 'voy_17', type: 'voyvoda', name: 'Войвода', cost: 12, chetaPoints: 7, goldDiamond: true },
];

// Deyets cards: 15 named historical figures
export const DEYETS_CARDS: Card[] = [
  {
    id: 'dey_vasil', type: 'deyets', name: 'Васил Левски',
    cost: 14, chetaPoints: 0, strength: 2, contribution: 'nabor',
    effect: 'При рисковано вербуване: ако се срещне Заптие, ходът не се прекъсва.',
    goldDiamond: true,
  },
  {
    id: 'dey_hristo', type: 'deyets', name: 'Христо Ботев',
    cost: 14, chetaPoints: 3, strength: 3, contribution: 'deynost',
    effect: 'При издигане: +2 Набор, +2 Дейност, +2 Бойна мощ на комитета.',
    goldDiamond: true,
  },
  // Regular — all 13 below are available in the initial deck
  {
    id: 'dey_sofroniy', type: 'deyets', name: 'Софроний Врачански',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'deynost',
    effect: 'При проучване: ако открита карта е Заптие, без последствия. Картата се поставя встрани.',
  },
  {
    id: 'dey_hadzhi', type: 'deyets', name: 'Хаджи Димитър',
    cost: 9, chetaPoints: 0, strength: 3, contribution: 'boyna',
    effect: 'Премахни едно открито Заптие от полето. На негово място — неоткрита карта от тестето.',
  },
  {
    id: 'dey_filip', type: 'deyets', name: 'Филип Тотю',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'deynost',
    effect: 'Добавя +1 сила при сформиране на група с принос Дейност.',
    groupBonus: '+1 Дейност при сформиране',
  },
  {
    id: 'dey_evlogi', type: 'deyets', name: 'Евлоги и Христо Георгиеви',
    cost: 9, chetaPoints: 2, strength: 2, contribution: 'nabor',
    effect: 'Добавя +1 сила при сформиране на всяка група.',
    groupBonus: '+1 при сформиране',
  },
  {
    id: 'dey_benkovski', type: 'deyets', name: 'Георги Бенковски',
    cost: 9, chetaPoints: 2, strength: 3, contribution: 'boyna',
    effect: 'При определена сила на Заптиетата: може да ги отстрани.',
  },
  {
    id: 'dey_rayna', type: 'deyets', name: 'Райна Княгиня',
    cost: 6, chetaPoints: 2, strength: 2, contribution: 'nabor',
    effect: 'Добавя +2 сила при сформиране на група с поне 3 Хайдути.',
    groupBonus: '+2 при 3+ Хайдути',
  },
  {
    id: 'dey_rakowski', type: 'deyets', name: 'Георги Раковски',
    cost: 9, chetaPoints: 2, strength: 3, contribution: 'boyna',
    effect: 'Добавя +1 сила при сформиране на група с принос Набор.',
    groupBonus: '+1 Набор при сформиране',
  },
  {
    id: 'dey_pop', type: 'deyets', name: 'Поп Харитон',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'nabor',
    effect: 'При разбит комитет след рисковано вербуване: влиза в сила.',
  },
  {
    id: 'dey_lyuben', type: 'deyets', name: 'Любен Каравелов',
    cost: 9, chetaPoints: 2, strength: 3, contribution: 'nabor',
    effect: 'Бонусът важи винаги при сформиране на група.',
    groupBonus: '+1 при всяка група',
  },
  {
    id: 'dey_petko_voy', type: 'deyets', name: 'Петко Войвода',
    cost: 9, chetaPoints: 0, strength: 2, contribution: 'boyna',
    effect: 'При разбит комитет: запазваш картите в ръка.',
  },
  {
    id: 'dey_panayot', type: 'deyets', name: 'Панайот Хитов',
    cost: 9, chetaPoints: 2, strength: 2, contribution: 'deynost',
    effect: 'Ако е издигнат от друг играч и са останали карти за чистене.',
  },
  {
    id: 'dey_stefan', type: 'deyets', name: 'Стефан Каража',
    cost: 9, chetaPoints: 0, strength: 3, contribution: 'boyna',
    effect: 'Добавя сила при сформиране на група с принос Бойна мощ.',
    groupBonus: '+1 Бойна мощ при сформиране',
  },
  {
    id: 'dey_dyado', type: 'deyets', name: 'Дядо Ильо',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'deynost',
    effect: 'Премахването на Заптие не предизвиква последствия.',
  },
];

// Zaptie cards: 16 cards
// Per a.txt: 8×str1 regular + 6×str2 regular + 1×str3 silverDiamond + 1×str3 goldDiamond
export const ZAPTIE_CARDS: Card[] = [
  // Regular — available in initial deck
  { id: 'zap_1', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_2', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_3', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_4', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_5', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_6', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_7', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_8', type: 'zaptie', name: 'Заптие', strength: 1 },
  { id: 'zap_9', type: 'zaptie', name: 'Заптие', strength: 2 },
  { id: 'zap_10', type: 'zaptie', name: 'Заптие', strength: 2 },
  { id: 'zap_11', type: 'zaptie', name: 'Заптие', strength: 2 },
  { id: 'zap_12', type: 'zaptie', name: 'Заптие', strength: 2 },
  { id: 'zap_13', type: 'zaptie', name: 'Заптие', strength: 2 },
  { id: 'zap_14', type: 'zaptie', name: 'Заптие', strength: 2 },
  // Diamond — stronger Zaптие enter on rotations
  { id: 'zap_15', type: 'zaptie', name: 'Заптие', strength: 3, silverDiamond: true },
  { id: 'zap_16', type: 'zaptie', name: 'Заптие', strength: 3, goldDiamond: true },
];

export const ALL_CARDS: Card[] = [
  ...HAYDUTI_CARDS,
  ...VOYVODA_CARDS,
  ...DEYETS_CARDS,
  ...ZAPTIE_CARDS,
];

// ============================================================
// GAME UTILITY FUNCTIONS
// ============================================================

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getMaxRotations(gameLength: GameLength): number {
  switch (gameLength) {
    case 'short': return 2;
    case 'medium': return 3;
    case 'long': return 4;
  }
}

export function getStatValue(stats: PlayerStats, type: ContributionType): number {
  switch (type) {
    case 'nabor': return stats.nabor;
    case 'deynost': return stats.deynost;
    case 'boyna': return stats.boyna;
  }
}

export function getNextStatValue(current: number): number | null {
  const idx = STAT_TRACK.indexOf(current);
  if (idx === -1 || idx === STAT_TRACK.length - 1) return null;
  return STAT_TRACK[idx + 1];
}

export function getUpgradeCost(targetValue: number): number {
  return STAT_UPGRADE_COSTS[targetValue] ?? 999;
}

export function getMaxReachableStatValue(current: number, groupStrength: number): number | null {
  let max: number | null = null;
  for (const level of STAT_TRACK) {
    if (level > current && getUpgradeCost(level) <= groupStrength) {
      max = level;
    }
  }
  return max;
}

export function getTotalZaptieBoyna(fieldCards: Card[], fieldFaceUp: boolean[]): number {
  return fieldCards.reduce((sum, card, i) => {
    if (fieldFaceUp[i] && card.type === 'zaptie') {
      return sum + (card.strength ?? 0);
    }
    return sum;
  }, 0);
}

export function canFormGroupByContribution(cards: Card[]): ContributionType | null {
  const hayduti = cards.filter(c => c.type === 'haydut');
  if (hayduti.length < 2) return null; // minimum 2 Хайдути required
  const contributions = Array.from(new Set(hayduti.map(c => c.contribution)));
  if (contributions.length === 1 && contributions[0]) return contributions[0];
  return null;
}

export function canFormGroupByColor(cards: Card[]): CardColor | null {
  const hayduti = cards.filter(c => c.type === 'haydut');
  if (hayduti.length < 2) return null; // minimum 2 Хайдути required
  const colors = Array.from(new Set(hayduti.map(c => c.color)));
  if (colors.length === 1 && colors[0]) return colors[0];
  return null;
}

export function getGroupStrength(cards: Card[]): number {
  return cards
    .filter(c => c.type === 'haydut')
    .reduce((sum, c) => sum + (c.strength ?? 0), 0);
}

export function getGroupContributions(cards: Card[]): ContributionType[] {
  const contribs = cards
    .filter(c => c.type === 'haydut' && c.contribution)
    .map(c => c.contribution as ContributionType);
  return Array.from(new Set(contribs));
}

export function contributionLabel(type: ContributionType): string {
  switch (type) {
    case 'nabor': return 'Набор';
    case 'deynost': return 'Дейност';
    case 'boyna': return 'Бойна мощ';
  }
}

export function colorLabel(color: CardColor): string {
  switch (color) {
    case 'green': return 'Зелен';
    case 'blue': return 'Син';
    case 'red': return 'Червен';
    case 'yellow': return 'Жълт';
  }
}

// ============================================================
// SCORING
// ============================================================

export interface PlayerScore {
  playerId: string;
  playerName: string;
  statTotal: number;
  leadershipBonus: number;
  voyvodaPoints: number;
  deyetsPoints: number;
  total: number;
}

export function calculateScores(players: Player[]): PlayerScore[] {
  // Find leaders for each stat
  const maxNabor = Math.max(...players.map(p => p.stats.nabor));
  const maxDeynost = Math.max(...players.map(p => p.stats.deynost));
  const maxBoyna = Math.max(...players.map(p => p.stats.boyna));

  return players.map(player => {
    const statTotal = player.stats.nabor + player.stats.deynost + player.stats.boyna;
    
    let leadershipBonus = 0;
    if (player.stats.nabor === maxNabor) leadershipBonus += 5;
    if (player.stats.deynost === maxDeynost) leadershipBonus += 5;
    if (player.stats.boyna === maxBoyna) leadershipBonus += 5;

    const voyvodaPoints = player.raisedVoyvodas.reduce((sum, c) => sum + (c.chetaPoints ?? 0), 0);
    
    // Deyets points (simplified - count all for now)
    const deyetsPoints = player.raisedDeytsi.reduce((sum, c) => sum + (c.chetaPoints ?? 0), 0);

    return {
      playerId: player.id,
      playerName: player.name,
      statTotal,
      leadershipBonus,
      voyvodaPoints,
      deyetsPoints,
      total: statTotal + leadershipBonus + voyvodaPoints + deyetsPoints,
    };
  });
}

// ============================================================
// INITIAL GAME STATE
// ============================================================

export function createInitialGameState(
  playerNames: string[],
  gameLength: GameLength
): GameState {
  // Build deck: all non-silver-diamond and non-gold-diamond cards
  const regularCards = ALL_CARDS.filter(c => !c.silverDiamond && !c.goldDiamond);

  // Silver and gold cards enter the game on deck rotations 1 and 2 respectively
  const usedCards: Card[] = [];
  
  // Shuffle regular cards for deck
  const deck = shuffle(regularCards);

  // Place 16 cards on field face-down
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
  };
}
