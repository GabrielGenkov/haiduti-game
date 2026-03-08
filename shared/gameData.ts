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
  traitId?: DeyetsTraitId; // links card to its trait
  // special diamond markers
  silverDiamond?: boolean; // enters on 1st reshuffle
  goldDiamond?: boolean;   // enters on 2nd reshuffle
}

export interface PlayerStats {
  nabor: number;   // hand size (4-10)
  deynost: number; // actions per turn (4-10)
  boyna: number;   // combat power (4-10)
}

// Trait IDs for each Деец
export type DeyetsTraitId =
  | 'hristo_botev'      // +2 group bonus any type; end: +1 all stats
  | 'vasil_levski'      // first Zaптие per turn ignored; end: +6 pts per stat lead
  | 'sofroniy'          // turn-start: peek 1 card free (no action cost)
  | 'rakowski'          // keep 1 card from group if committee secret
  | 'evlogi'            // +2 group bonus if набор type; end: +1 набор stat
  | 'petko_voy'         // on defeat: keep 2 cards; end: +2 pts per raised Деец
  | 'lyuben'            // +1 group bonus any type; end: +1 chosen stat
  | 'rayna'             // +1 group bonus if 3+ hayduti
  | 'benkovski'         // turn-start: +2 actions if ≥3 Zaптие power; end: +2 pts per raised Войвода
  | 'pop_hariton'       // on defeat: form 1 group before discarding
  | 'hadzhi'            // turn-start: remove 1 Zaптие from field; end: +4 pts if leading бойна
  | 'dyado_ilyo'        // on reveal: Zaптие removed, +2 hand limit this turn
  | 'filip_totyu'       // +2 group bonus if дейност type; end: +1 дейност stat
  | 'panayot'           // when another player's committee defeated: take 2 cards
  | 'stefan_karadzha';  // +2 group bonus if бойна type; end: +1 бойна stat

export interface Player {
  id: string;
  name: string;
  stats: PlayerStats;
  isRevealed: boolean; // false = secret (green), true = revealed (red)
  hand: Card[];
  raisedVoyvodas: Card[];
  raisedDeytsi: Card[];
  // Active traits from raised Дейци
  traits: DeyetsTraitId[];
  // Per-turn state for trait effects
  zaptieTurnIgnored: boolean;   // Васил Левски: first Zaптие this turn already ignored
  dyadoIlyoActive: boolean;     // Дядо Ильо: +2 hand limit active this turn
  lyubenStatChoice?: ContributionType; // Любен Каравелов: chosen stat to boost at end
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
    // Дядо Ильо: Zaптие was removed and player gets +2 hand limit
    dyadoIlyoTriggered?: boolean;
    // Поп Харитон: player can form 1 group before discarding on defeat
    popHaritonTriggered?: boolean;
    // Петко Войвода: player keeps 2 cards on defeat
    petkoVoyTriggered?: boolean;
    // Whether the Заптие came from a risky recruit (no forming allowed after discard)
    fromRiskyRecruit?: boolean;
  };
  // Turn-start ability state
  sofroniyAbilityUsed: boolean;  // Софроний: free peek used this turn
  hadzhiAbilityUsed: boolean;    // Хаджи Димитър: remove Zaптие used this turn
  benkovskiApplied: boolean;     // Бенковски: +2 actions already applied this turn
  // Панайот Хитов: pending card selection after another player's defeat
  panayotTrigger?: {
    beneficiaryPlayerIndex: number; // who gets to pick 2 cards
    defeatedPlayerIndex: number;    // whose cards to pick from
  };
  // Поп Харитон: forming step during defeat resolution
  popHaritonForming: boolean;
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
// Per cards.txt: 4×(cost4,pts2) regular + 5×(cost7,pts3) regular + 5×(cost10,pts5) silverDiamond + 3×(cost12,pts7) goldDiamond
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
    traitId: 'vasil_levski',
    effect: 'Черта: Игнорира 1-во Заптие за хода (без разкриване). В края: +6т за всеки показател, в който водиш.',
    goldDiamond: true,
  },
  {
    id: 'dey_hristo', type: 'deyets', name: 'Христо Ботев',
    cost: 14, chetaPoints: 3, strength: 3, contribution: 'deynost',
    traitId: 'hristo_botev',
    effect: 'Черта: +2 сила на всяка група. В края: +1 към всеки показател.',
    goldDiamond: true,
  },
  // Regular — all 13 below are available in the initial deck
  {
    id: 'dey_sofroniy', type: 'deyets', name: 'Софроний Врачански',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'deynost',
    traitId: 'sofroniy',
    effect: 'Черта: В началото на хода — безплатно проучване на горната карта от тестето (без харчене на действие).',
  },
  {
    id: 'dey_hadzhi', type: 'deyets', name: 'Хаджи Димитър',
    cost: 9, chetaPoints: 0, strength: 3, contribution: 'boyna',
    traitId: 'hadzhi',
    effect: 'Черта: Веднъж за ход — премахни 1 открито Заптие от полето. В края: +4т ако водиш по Бойна мощ.',
  },
  {
    id: 'dey_filip', type: 'deyets', name: 'Филип Тотю',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'deynost',
    traitId: 'filip_totyu',
    effect: 'Черта: +2 сила при сформиране на група с принос Дейност. В края: +1 към Дейност.',
    groupBonus: '+2 Дейност при сформиране',
  },
  {
    id: 'dey_evlogi', type: 'deyets', name: 'Евлоги и Христо Георгиеви',
    cost: 9, chetaPoints: 2, strength: 2, contribution: 'nabor',
    traitId: 'evlogi',
    effect: 'Черта: +2 сила при сформиране на група с принос Набор. В края: +1 към Набор.',
    groupBonus: '+2 Набор при сформиране',
  },
  {
    id: 'dey_benkovski', type: 'deyets', name: 'Георги Бенковски',
    cost: 9, chetaPoints: 2, strength: 3, contribution: 'boyna',
    traitId: 'benkovski',
    effect: 'Черта: Ако сумарната Бойна мощ на Заптиетата на полето ≥3 — получаваш +2 действия за хода. В края: +2т за всеки издигнат Войвода.',
  },
  {
    id: 'dey_rayna', type: 'deyets', name: 'Райна Княгиня',
    cost: 6, chetaPoints: 2, strength: 2, contribution: 'nabor',
    traitId: 'rayna',
    effect: 'Черта: +1 сила при сформиране на група с поне 3 Хайдути.',
    groupBonus: '+1 при 3+ Хайдути',
  },
  {
    id: 'dey_rakowski', type: 'deyets', name: 'Георги Раковски',
    cost: 9, chetaPoints: 2, strength: 3, contribution: 'boyna',
    traitId: 'rakowski',
    effect: 'Черта: При сформиране на група — ако комитетът е таен, запазваш 1 карта от групата в ръка.',
  },
  {
    id: 'dey_pop', type: 'deyets', name: 'Поп Харитон',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'nabor',
    traitId: 'pop_hariton',
    effect: 'Черта: При разбит комитет — преди изчистването на ръката, може да сформираш 1 последна група.',
  },
  {
    id: 'dey_lyuben', type: 'deyets', name: 'Любен Каравелов',
    cost: 9, chetaPoints: 2, strength: 3, contribution: 'nabor',
    traitId: 'lyuben',
    effect: 'Черта: +1 сила на всяка група. В края: +1 към избран показател.',
    groupBonus: '+1 при всяка група',
  },
  {
    id: 'dey_petko_voy', type: 'deyets', name: 'Петко Войвода',
    cost: 9, chetaPoints: 0, strength: 2, contribution: 'boyna',
    traitId: 'petko_voy',
    effect: 'Черта: При разбит комитет — запазваш 2 карти по избор вместо да изчистиш всичко. В края: +2т за всеки издигнат Деец.',
  },
  {
    id: 'dey_panayot', type: 'deyets', name: 'Панайот Хитов',
    cost: 9, chetaPoints: 2, strength: 2, contribution: 'deynost',
    traitId: 'panayot',
    effect: 'Черта: Когато друг играч е разбит — вземаш до 2 карти от неговата ръка преди изчистването.',
  },
  {
    id: 'dey_stefan', type: 'deyets', name: 'Стефан Каража',
    cost: 9, chetaPoints: 0, strength: 3, contribution: 'boyna',
    traitId: 'stefan_karadzha',
    effect: 'Черта: +2 сила при сформиране на група с принос Бойна мощ. В края: +1 към Бойна мощ.',
    groupBonus: '+2 Бойна мощ при сформиране',
  },
  {
    id: 'dey_dyado', type: 'deyets', name: 'Дядо Ильо',
    cost: 6, chetaPoints: 0, strength: 2, contribution: 'deynost',
    traitId: 'dyado_ilyo',
    effect: 'Черта: Когато комитетът се разкрива от Заптие — Заптието се премахва без последствия и получаваш +2 Набор за хода.',
  },
];

// Zaptie cards: 16 cards
// Per cards.txt: 8×str1 regular + 6×str2 regular + 1×str3 silverDiamond + 1×str3 goldDiamond
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
  // Effective stats after end-of-game trait boosts
  effectiveStats: PlayerStats;
  statTotal: number;
  leadershipBonus: number;
  voyvodaPoints: number;
  deyetsPoints: number;
  traitBonusPoints: number;
  traitBonusBreakdown: string[];
  total: number;
}

export function calculateScores(players: Player[]): PlayerScore[] {
  // ── Step 1: Apply end-of-game stat boosts from traits ──
  // These modify effective stats BEFORE leadership comparison:
  // Христо Ботев: +1 all stats
  // Евлоги: +1 набор
  // Филип Тотю: +1 дейност
  // Стефан Каража: +1 бойна
  // Любен Каравелов: +1 chosen stat
  const effectiveStatsList = players.map(player => {
    const s = { ...player.stats };
    if (player.traits.includes('hristo_botev')) {
      s.nabor = Math.min(s.nabor + 1, 10);
      s.deynost = Math.min(s.deynost + 1, 10);
      s.boyna = Math.min(s.boyna + 1, 10);
    }
    if (player.traits.includes('evlogi')) s.nabor = Math.min(s.nabor + 1, 10);
    if (player.traits.includes('filip_totyu')) s.deynost = Math.min(s.deynost + 1, 10);
    if (player.traits.includes('stefan_karadzha')) s.boyna = Math.min(s.boyna + 1, 10);
    if (player.traits.includes('lyuben') && player.lyubenStatChoice) {
      s[player.lyubenStatChoice] = Math.min(s[player.lyubenStatChoice] + 1, 10);
    }
    return s;
  });

  // ── Step 2: Find leaders using effective stats ──
  const maxNabor = Math.max(...effectiveStatsList.map(s => s.nabor));
  const maxDeynost = Math.max(...effectiveStatsList.map(s => s.deynost));
  const maxBoyna = Math.max(...effectiveStatsList.map(s => s.boyna));

  return players.map((player, idx) => {
    const effectiveStats = effectiveStatsList[idx];
    const statTotal = effectiveStats.nabor + effectiveStats.deynost + effectiveStats.boyna;

    // Standard leadership bonus (5 pts per stat where player leads)
    let leadershipBonus = 0;
    if (effectiveStats.nabor === maxNabor) leadershipBonus += 5;
    if (effectiveStats.deynost === maxDeynost) leadershipBonus += 5;
    if (effectiveStats.boyna === maxBoyna) leadershipBonus += 5;

    const voyvodaPoints = player.raisedVoyvodas.reduce((sum, c) => sum + (c.chetaPoints ?? 0), 0);
    const deyetsPoints = player.raisedDeytsi.reduce((sum, c) => sum + (c.chetaPoints ?? 0), 0);

    // ── Step 3: Extra trait bonus points ──
    let traitBonusPoints = 0;
    const traitBonusBreakdown: string[] = [];

    // Васил Левски: +6 pts for each stat where player leads
    if (player.traits.includes('vasil_levski')) {
      let vasil = 0;
      if (effectiveStats.nabor === maxNabor) vasil += 6;
      if (effectiveStats.deynost === maxDeynost) vasil += 6;
      if (effectiveStats.boyna === maxBoyna) vasil += 6;
      if (vasil > 0) {
        traitBonusPoints += vasil;
        traitBonusBreakdown.push(`Васил Левски: +${vasil} (водещ по показател)`);
      }
    }

    // Георги Бенковски: +2 pts per raised Войвода
    if (player.traits.includes('benkovski') && player.raisedVoyvodas.length > 0) {
      const bonus = player.raisedVoyvodas.length * 2;
      traitBonusPoints += bonus;
      traitBonusBreakdown.push(`Бенковски: +${bonus} (${player.raisedVoyvodas.length} Войводи)`);
    }

    // Петко Войвода: +2 pts per raised Деец
    if (player.traits.includes('petko_voy') && player.raisedDeytsi.length > 0) {
      const bonus = player.raisedDeytsi.length * 2;
      traitBonusPoints += bonus;
      traitBonusBreakdown.push(`Петко Войвода: +${bonus} (${player.raisedDeytsi.length} Дейци)`);
    }

    // Хаджи Димитър: +4 pts if player leads in бойна
    if (player.traits.includes('hadzhi') && effectiveStats.boyna === maxBoyna) {
      traitBonusPoints += 4;
      traitBonusBreakdown.push('Хаджи Димитър: +4 (водещ по Бойна мощ)');
    }

    // Stat boost breakdown labels
    if (player.traits.includes('hristo_botev')) {
      traitBonusBreakdown.push('Христо Ботев: +1 на всички показатели');
    }
    if (player.traits.includes('evlogi')) {
      traitBonusBreakdown.push('Евлоги: +1 Набор');
    }
    if (player.traits.includes('filip_totyu')) {
      traitBonusBreakdown.push('Филип Тотю: +1 Дейност');
    }
    if (player.traits.includes('stefan_karadzha')) {
      traitBonusBreakdown.push('Стефан Каража: +1 Бойна мощ');
    }
    if (player.traits.includes('lyuben') && player.lyubenStatChoice) {
      traitBonusBreakdown.push(`Любен Каравелов: +1 ${player.lyubenStatChoice}`);
    }

    return {
      playerId: player.id,
      playerName: player.name,
      effectiveStats,
      statTotal,
      leadershipBonus,
      voyvodaPoints,
      deyetsPoints,
      traitBonusPoints,
      traitBonusBreakdown,
      total: statTotal + leadershipBonus + voyvodaPoints + deyetsPoints + traitBonusPoints,
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
