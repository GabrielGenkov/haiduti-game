import type { CardColor, DeyetsTraitId } from '@shared/gameData';
import { CDN_BASE } from '@/config';

// Card artwork (served from public/images/)
const IMG_BASE = '/images';

export const CARD_BACK = `${IMG_BASE}/card-back.png`;
export const TABLE_BG = `${CDN_BASE}/haiduti-table-bg-3gp2hdrBo9Wp4k5QjKnMim.webp`;
export const BANNER_IMG = `${IMG_BASE}/banner.png`;
export const VOYVODA_IMG = `${IMG_BASE}/voyvoda.png`;
export const ZAPTIE_IMG = `${IMG_BASE}/zaptie.png`;

export const HAYDUT_IMAGES: Record<CardColor, string> = {
  green:  `${IMG_BASE}/haydut-green.png`,
  blue:   `${IMG_BASE}/haydut-blue.png`,
  red:    `${IMG_BASE}/haydut-red.png`,
  yellow: `${IMG_BASE}/haydut-yellow.png`,
};

export const DEYETS_IMAGES: Record<DeyetsTraitId, string> = {
  vasil_levski:    `${IMG_BASE}/vasil-levski.png`,
  hristo_botev:    `${IMG_BASE}/hristo-botev.png`,
  sofroniy:        `${IMG_BASE}/sofroniy.png`,
  rakowski:        `${IMG_BASE}/rakowski.png`,
  evlogi:          `${IMG_BASE}/evlogi.png`,
  petko_voy:       `${IMG_BASE}/petko-voy.png`,
  lyuben:          `${IMG_BASE}/lyuben.png`,
  rayna:           `${IMG_BASE}/rayna.png`,
  benkovski:       `${IMG_BASE}/benkovski.png`,
  pop_hariton:     `${IMG_BASE}/pop-hariton.png`,
  hadzhi:          `${IMG_BASE}/hadzhi.png`,
  dyado_ilyo:      `${IMG_BASE}/dyado-ilyo.png`,
  filip_totyu:     `${IMG_BASE}/filip-totyu.png`,
  panayot:         `${IMG_BASE}/panayot.png`,
  stefan_karadzha: `${IMG_BASE}/stefan-karadzha.png`,
};

export const COLOR_STYLES: Record<CardColor, { bg: string; border: string; text: string }> = {
  green:  { bg: '#1a3d2b', border: '#2d7a4f', text: '#6ee7a0' },
  blue:   { bg: '#1a2a4d', border: '#3b6fd4', text: '#93c5fd' },
  red:    { bg: '#3d1a1a', border: '#c0392b', text: '#fca5a5' },
  yellow: { bg: '#3d3000', border: '#d4a017', text: '#fde68a' },
};

export const PLAYER_COLORS = [
  '#2d7a4f', '#3b6fd4', '#c0392b', '#d4a017', '#8b5cf6', '#06b6d4',
];

export const TRAIT_META: Record<DeyetsTraitId, { label: string; icon: string; color: string; shortDesc: string }> = {
  hristo_botev:    { label: 'Христо Ботев',    icon: '🌟', color: '#fbbf24', shortDesc: '+2 сила на групи; +1 всички показатели в края' },
  vasil_levski:    { label: 'Васил Левски',     icon: '🛡️', color: '#6ee7a0', shortDesc: 'Игнорира 1-во Заптие/ход; +6т за водещ показател' },
  sofroniy:        { label: 'Софроний',         icon: '👁️', color: '#93c5fd', shortDesc: 'Безплатно проучване в началото на хода' },
  rakowski:        { label: 'Г. Раковски',      icon: '🦅', color: '#fde68a', shortDesc: 'Запазва 1 карта от групата (таен комитет)' },
  evlogi:          { label: 'Евлоги',           icon: '💰', color: '#fbbf24', shortDesc: '+2 сила за Набор групи; +1 Набор в края' },
  petko_voy:       { label: 'Петко Войвода',    icon: '⚔️', color: '#fca5a5', shortDesc: 'При разгром — запазва 2 карти; +2т/Деец в края' },
  lyuben:          { label: 'Л. Каравелов',     icon: '📚', color: '#c4b5fd', shortDesc: '+1 сила на групи; +1 избран показател в края' },
  rayna:           { label: 'Райна Княгиня',    icon: '🏴', color: '#f9a8d4', shortDesc: '+1 сила ако 3+ Хайдути в група' },
  benkovski:       { label: 'Г. Бенковски',     icon: '🔥', color: '#fb923c', shortDesc: '+2 действия ако ≥3 Заптие сила; +2т/Войвода в края' },
  pop_hariton:     { label: 'Поп Харитон',      icon: '✝️', color: '#a78bfa', shortDesc: 'При разгром — сформира 1 група преди изчистване' },
  hadzhi:          { label: 'Хаджи Димитър',    icon: '🗡️', color: '#fca5a5', shortDesc: 'Премахва 1 Заптие от полето; +4т ако води Бойна' },
  dyado_ilyo:      { label: 'Дядо Ильо',        icon: '🧓', color: '#86efac', shortDesc: 'При разкриване — Заптието се премахва; +2 Набор за хода' },
  filip_totyu:     { label: 'Филип Тотю',       icon: '⚡', color: '#fcd34d', shortDesc: '+2 сила за Дейност групи; +1 Дейност в края' },
  panayot:         { label: 'П. Хитов',         icon: '🦊', color: '#fdba74', shortDesc: 'При чужд разгром — взима 2 карти от разбития' },
  stefan_karadzha: { label: 'Ст. Каража',       icon: '🏹', color: '#fca5a5', shortDesc: '+2 сила за Бойна групи; +1 Бойна в края' },
};
