import { Card, CardColor, CardType, ContributionType } from '../types/card';

// Hayduti cards: 4 colors x 6 types x 2 copies = 48 cards
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
  ...makeHayduti('green', 'nabor', 2, 2),
  ...makeHayduti('green', 'nabor', 3, 2),
  ...makeHayduti('green', 'deynost', 2, 2),
  ...makeHayduti('green', 'deynost', 3, 2),
  ...makeHayduti('green', 'boyna', 2, 2),
  ...makeHayduti('green', 'boyna', 3, 2),
  ...makeHayduti('blue', 'nabor', 2, 2),
  ...makeHayduti('blue', 'nabor', 3, 2),
  ...makeHayduti('blue', 'deynost', 2, 2),
  ...makeHayduti('blue', 'deynost', 3, 2),
  ...makeHayduti('blue', 'boyna', 2, 2),
  ...makeHayduti('blue', 'boyna', 3, 2),
  ...makeHayduti('red', 'nabor', 2, 2),
  ...makeHayduti('red', 'nabor', 3, 2),
  ...makeHayduti('red', 'deynost', 2, 2),
  ...makeHayduti('red', 'deynost', 3, 2),
  ...makeHayduti('red', 'boyna', 2, 2),
  ...makeHayduti('red', 'boyna', 3, 2),
  ...makeHayduti('yellow', 'nabor', 2, 2),
  ...makeHayduti('yellow', 'nabor', 3, 2),
  ...makeHayduti('yellow', 'deynost', 2, 2),
  ...makeHayduti('yellow', 'deynost', 3, 2),
  ...makeHayduti('yellow', 'boyna', 2, 2),
  ...makeHayduti('yellow', 'boyna', 3, 2),
];

export const VOYVODA_CARDS: Card[] = [
  { id: 'voy_1', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_2', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_3', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_4', type: 'voyvoda', name: 'Войвода', cost: 4, chetaPoints: 2 },
  { id: 'voy_5', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_6', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_7', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_8', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_9', type: 'voyvoda', name: 'Войвода', cost: 7, chetaPoints: 3 },
  { id: 'voy_10', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_11', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_12', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_13', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_14', type: 'voyvoda', name: 'Войвода', cost: 10, chetaPoints: 5, silverDiamond: true },
  { id: 'voy_15', type: 'voyvoda', name: 'Войвода', cost: 12, chetaPoints: 7, goldDiamond: true },
  { id: 'voy_16', type: 'voyvoda', name: 'Войвода', cost: 12, chetaPoints: 7, goldDiamond: true },
  { id: 'voy_17', type: 'voyvoda', name: 'Войвода', cost: 12, chetaPoints: 7, goldDiamond: true },
];

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
    cost: 9, chetaPoints: 0, strength: 2, contribution: 'deynost',
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

export const ZAPTIE_CARDS: Card[] = [
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
  { id: 'zap_15', type: 'zaptie', name: 'Заптие', strength: 3, silverDiamond: true },
  { id: 'zap_16', type: 'zaptie', name: 'Заптие', strength: 3, goldDiamond: true },
];

export const ALL_CARDS: Card[] = [
  ...HAYDUTI_CARDS,
  ...VOYVODA_CARDS,
  ...DEYETS_CARDS,
  ...ZAPTIE_CARDS,
];
