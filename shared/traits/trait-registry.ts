import { DeyetsTraitId, Card, ContributionType } from '../types/card';
import { Player, PlayerStats } from '../types/player';
import { GameState } from '../types/state';

export interface TraitStrategy {
  readonly id: DeyetsTraitId;

  /** Extra strength when forming a group to improve a stat */
  getGroupBonus?(player: Player, hayduti: Card[], statType: ContributionType): number;

  /** Extra strength when raising a Voyvoda/Deyets (contribution-neutral) */
  getRaiseBonus?(player: Player, hayduti: Card[]): number;

  /** Modify hand after group formation (e.g., Rakowski keeps 1 card). Return null for no effect. */
  onGroupFormed?(player: Player, hayduti: Card[], selectedCardIds: string[]): { newHand: Card[]; discarded: Card[] } | null;

  /** Intercept Zaptie before normal processing. Return modified state to intercept, null to continue. */
  onZaptieEncounter?(state: GameState, zaptieCard: Card): GameState | null;

  /** Called when committee is defeated. Return defeat modifiers or null. */
  onDefeat?(state: GameState, player: Player): { keepCards?: number; allowFormGroup?: boolean } | null;

  /** Called when another player is defeated. */
  onOtherPlayerDefeated?(state: GameState, defeatedPlayerIndex: number, beneficiaryIndex: number): Partial<GameState> | null;

  /** Modify effective stats at end of game */
  modifyEndGameStats?(stats: PlayerStats, player: Player): PlayerStats;

  /** Calculate bonus points at end of game */
  getEndGameBonusPoints?(player: Player, effectiveStats: PlayerStats, allEffectiveStats: PlayerStats[]): { points: number; label: string } | null;

  /** Get scoring breakdown label (for stat boost display) */
  getScoringLabel?(player: Player): string | null;

  /** Reset per-turn flags */
  resetTurnState?(player: Player): Partial<Player>;
}

const registry = new Map<DeyetsTraitId, TraitStrategy>();

export function registerTrait(trait: TraitStrategy): void {
  registry.set(trait.id, trait);
}

export function getTrait(id: DeyetsTraitId): TraitStrategy | undefined {
  return registry.get(id);
}

export function getActiveTraits(player: Player): TraitStrategy[] {
  return player.traits
    .map(id => registry.get(id))
    .filter((t): t is TraitStrategy => t !== undefined);
}

/** Calculate combined group bonus from all active traits for stat improvement */
export function getTraitGroupBonus(
  player: Player,
  hayduti: Card[],
  statType: ContributionType
): number {
  let bonus = 0;
  for (const trait of getActiveTraits(player)) {
    if (trait.getGroupBonus) {
      bonus += trait.getGroupBonus(player, hayduti, statType);
    }
  }
  return bonus;
}

/** Calculate combined raise bonus from all active traits */
export function getTraitRaiseBonus(player: Player, hayduti: Card[]): number {
  let bonus = 0;
  for (const trait of getActiveTraits(player)) {
    if (trait.getRaiseBonus) {
      bonus += trait.getRaiseBonus(player, hayduti);
    }
  }
  return bonus;
}

/** Apply onGroupFormed hooks. Returns modified hand/discarded or null if no trait intercepts. */
export function applyGroupFormedTraits(
  player: Player,
  hayduti: Card[],
  selectedCardIds: string[]
): { newHand: Card[]; discarded: Card[] } | null {
  for (const trait of getActiveTraits(player)) {
    if (trait.onGroupFormed) {
      const result = trait.onGroupFormed(player, hayduti, selectedCardIds);
      if (result) return result;
    }
  }
  return null;
}
