import { Card, ContributionType, DeyetsTraitId } from '../types/card';
import { Player, PlayerStats } from '../types/player';

export interface GroupBonusRule {
  id: DeyetsTraitId;
  applies: (player: Player, hayduti: Card[], contribution: ContributionType) => boolean;
  bonus: number;
}

export interface RaiseBonusRule {
  id: DeyetsTraitId;
  applies: (player: Player, hayduti: Card[]) => boolean;
  bonus: number;
}

export interface ScoreRule {
  id: DeyetsTraitId;
  applyStats?: (stats: PlayerStats, player: Player) => PlayerStats;
  getPoints?: (player: Player, stats: PlayerStats, allStats: PlayerStats[]) => number;
  getLabel?: (player: Player, stats: PlayerStats, allStats: PlayerStats[]) => string | null;
}

function isLeaderFor(stat: ContributionType, stats: PlayerStats, allStats: PlayerStats[]): boolean {
  const maxValue = Math.max(...allStats.map(current => current[stat]));
  return stats[stat] === maxValue;
}

export const GROUP_BONUS_RULES: GroupBonusRule[] = [
  {
    id: 'hristo_botev',
    applies: () => true,
    bonus: 2,
  },
  {
    id: 'lyuben',
    applies: () => true,
    bonus: 1,
  },
  {
    id: 'rayna',
    applies: (_player, hayduti) => hayduti.length >= 3,
    bonus: 1,
  },
  {
    id: 'evlogi',
    applies: (_player, _hayduti, contribution) => contribution === 'nabor',
    bonus: 2,
  },
  {
    id: 'filip_totyu',
    applies: (_player, _hayduti, contribution) => contribution === 'deynost',
    bonus: 2,
  },
  {
    id: 'stefan_karadzha',
    applies: (_player, _hayduti, contribution) => contribution === 'boyna',
    bonus: 2,
  },
];

export const RAISE_BONUS_RULES: RaiseBonusRule[] = [
  {
    id: 'hristo_botev',
    applies: () => true,
    bonus: 2,
  },
  {
    id: 'lyuben',
    applies: () => true,
    bonus: 1,
  },
  {
    id: 'rayna',
    applies: (_player, hayduti) => hayduti.length >= 3,
    bonus: 1,
  },
];

export function getTraitGroupBonusFromTable(
  player: Player,
  hayduti: Card[],
  statType: ContributionType
): number {
  let bonus = 0;
  for (const rule of GROUP_BONUS_RULES) {
    if (player.traits.includes(rule.id) && rule.applies(player, hayduti, statType)) {
      bonus += rule.bonus;
    }
  }
  return bonus;
}

export function getTraitRaiseBonusFromTable(player: Player, hayduti: Card[]): number {
  let bonus = 0;
  for (const rule of RAISE_BONUS_RULES) {
    if (player.traits.includes(rule.id) && rule.applies(player, hayduti)) {
      bonus += rule.bonus;
    }
  }
  return bonus;
}

export const SCORE_RULES: ScoreRule[] = [
  {
    id: 'hristo_botev',
    applyStats: stats => ({
      nabor: Math.min(stats.nabor + 1, 10),
      deynost: Math.min(stats.deynost + 1, 10),
      boyna: Math.min(stats.boyna + 1, 10),
    }),
    getLabel: () => 'Христо Ботев: +1 на всички показатели',
  },
  {
    id: 'evlogi',
    applyStats: stats => ({ ...stats, nabor: Math.min(stats.nabor + 1, 10) }),
    getLabel: () => 'Евлоги и Христо Георгиеви: +1 Набор',
  },
  {
    id: 'filip_totyu',
    applyStats: stats => ({ ...stats, deynost: Math.min(stats.deynost + 1, 10) }),
    getLabel: () => 'Филип Тотю: +1 Дейност',
  },
  {
    id: 'stefan_karadzha',
    applyStats: stats => ({ ...stats, boyna: Math.min(stats.boyna + 1, 10) }),
    getLabel: () => 'Стефан Кара Джа: +1 Бойна мощ',
  },
  {
    id: 'lyuben',
    applyStats: (stats, player) => {
      if (!player.lyubenStatChoice) return stats;
      return {
        ...stats,
        [player.lyubenStatChoice]: Math.min(stats[player.lyubenStatChoice] + 1, 10),
      };
    },
    getLabel: player =>
      player.lyubenStatChoice ? `Любен Каравелов: +1 ${player.lyubenStatChoice}` : null,
  },
  {
    id: 'vasil_levski',
    getPoints: (_player, stats, allStats) => {
      let total = 0;
      if (isLeaderFor('nabor', stats, allStats)) total += 6;
      if (isLeaderFor('deynost', stats, allStats)) total += 6;
      if (isLeaderFor('boyna', stats, allStats)) total += 6;
      return total;
    },
    getLabel: (_player, stats, allStats) => {
      const points =
        (isLeaderFor('nabor', stats, allStats) ? 6 : 0) +
        (isLeaderFor('deynost', stats, allStats) ? 6 : 0) +
        (isLeaderFor('boyna', stats, allStats) ? 6 : 0);
      return points > 0 ? `Васил Левски: +${points}` : null;
    },
  },
  {
    id: 'benkovski',
    getPoints: player => player.raisedVoyvodas.length * 2,
    getLabel: player =>
      player.raisedVoyvodas.length > 0
        ? `Георги Бенковски: +${player.raisedVoyvodas.length * 2}`
        : null,
  },
  {
    id: 'hadzhi',
    getPoints: (_player, stats, allStats) => (isLeaderFor('boyna', stats, allStats) ? 4 : 0),
    getLabel: (_player, stats, allStats) =>
      isLeaderFor('boyna', stats, allStats) ? 'Хаджи Димитър: +4' : null,
  },
  {
    id: 'petko_voy',
    getPoints: player => player.raisedDeytsi.length * 2,
    getLabel: player =>
      player.raisedDeytsi.length > 0
        ? `Петко Войвода: +${player.raisedDeytsi.length * 2}`
        : null,
  },
  {
    id: 'rakowski',
    getPoints: (_player, stats, allStats) => (isLeaderFor('nabor', stats, allStats) ? 4 : 0),
    getLabel: (_player, stats, allStats) =>
      isLeaderFor('nabor', stats, allStats) ? 'Георги Раковски: +4' : null,
  },
  {
    id: 'panayot',
    getPoints: (_player, stats, allStats) => (isLeaderFor('deynost', stats, allStats) ? 4 : 0),
    getLabel: (_player, stats, allStats) =>
      isLeaderFor('deynost', stats, allStats) ? 'Панайот Хитов: +4' : null,
  },
];
