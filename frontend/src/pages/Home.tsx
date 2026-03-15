// ХАЙДУТИ — Home Page
// Design: Хайдушка чета — warm board-game aesthetic
// Hero: full-bleed illustrated banner, parchment card gallery, wooden panels

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { HAYDUTI_CARDS, VOYVODA_CARDS, DEYETS_CARDS, ZAPTIE_CARDS, Card, CardColor, ContributionType, DeyetsTraitId } from '@shared/gameData';
import { BANNER_IMG, CARD_BACK, VOYVODA_IMG, ZAPTIE_IMG, HAYDUT_IMAGES, DEYETS_IMAGES } from '@/components/game/constants';

// Trait icons for Дейци gallery display
const TRAIT_ICONS: Record<DeyetsTraitId, { icon: string; color: string }> = {
  hristo_botev:    { icon: '\u{1F31F}', color: '#fbbf24' },
  vasil_levski:    { icon: '\u{1F6E1}\uFE0F', color: '#6ee7a0' },
  sofroniy:        { icon: '\u{1F441}\uFE0F', color: '#93c5fd' },
  rakowski:        { icon: '\u{1F985}', color: '#fde68a' },
  evlogi:          { icon: '\u{1F4B0}', color: '#fbbf24' },
  petko_voy:       { icon: '\u2694\uFE0F', color: '#fca5a5' },
  lyuben:          { icon: '\u{1F4DA}', color: '#c4b5fd' },
  rayna:           { icon: '\u{1F3F4}', color: '#f9a8d4' },
  benkovski:       { icon: '\u{1F525}', color: '#fb923c' },
  pop_hariton:     { icon: '\u271D\uFE0F', color: '#a78bfa' },
  hadzhi:          { icon: '\u{1F5E1}\uFE0F', color: '#fca5a5' },
  dyado_ilyo:      { icon: '\u{1F9D3}', color: '#86efac' },
  filip_totyu:     { icon: '\u26A1', color: '#fcd34d' },
  panayot:         { icon: '\u{1F98A}', color: '#fdba74' },
  stefan_karadzha: { icon: '\u{1F3F9}', color: '#fca5a5' },
};

const HERO_IMG = BANNER_IMG;

type GalleryTab = 'hayduti' | 'voyvoda' | 'deyets' | 'zaptie';

const COLOR_STYLES: Record<CardColor, { bg: string; border: string; label: string }> = {
  green:  { bg: 'bg-emerald-900/40',  border: 'border-emerald-600',  label: 'Зелен' },
  blue:   { bg: 'bg-blue-900/40',     border: 'border-blue-500',     label: 'Син' },
  red:    { bg: 'bg-red-900/40',      border: 'border-red-600',      label: 'Червен' },
  yellow: { bg: 'bg-yellow-900/40',   border: 'border-yellow-500',   label: 'Жълт' },
};

const CONTRIBUTION_ICONS: Record<ContributionType, { icon: string; label: string; color: string }> = {
  nabor:   { icon: '\u{1F3B4}', label: 'Набор',      color: 'text-sky-400' },
  deynost: { icon: '\u26A1', label: 'Дейност',    color: 'text-amber-400' },
  boyna:   { icon: '\u2694\uFE0F', label: 'Бойна мощ', color: 'text-red-400' },
};

function CardDisplay({ card }: { card: Card }) {
  const [flipped, setFlipped] = useState(false);
  const contrib = card.contribution ? CONTRIBUTION_ICONS[card.contribution] : null;

  const borderClass = card.type === 'zaptie' ? 'border-red-700'
    : card.color ? COLOR_STYLES[card.color].border
    : 'border-amber-700';

  const imgSrc = card.type === 'zaptie' ? ZAPTIE_IMG
    : card.type === 'haydut' && card.color ? HAYDUT_IMAGES[card.color]
    : card.type === 'voyvoda' ? VOYVODA_IMG
    : card.type === 'deyets' && card.traitId ? DEYETS_IMAGES[card.traitId]
    : undefined;

  return (
    <motion.div
      className="card-flip-container cursor-pointer"
      style={{ width: 112, height: 176 }}
      onClick={() => setFlipped(!flipped)}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className={`card-flip-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div className={`card-face relative w-full h-full rounded-lg border-2 ${borderClass} overflow-hidden shadow-lg`}>
          <img src={imgSrc} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1">
            <div className="font-cinzel text-xs font-semibold text-amber-100 text-center leading-tight truncate">
              {card.name}
            </div>
            {card.type === 'deyets' && card.traitId ? (
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span style={{ fontSize: 12, color: TRAIT_ICONS[card.traitId].color }}>
                  {TRAIT_ICONS[card.traitId].icon}
                </span>
                {card.cost != null && (
                  <span className="text-xs text-amber-300">{'\u{1F4B0}'}{card.cost}</span>
                )}
                {(card.silverDiamond || card.goldDiamond) && (
                  <span style={{ fontSize: 9, color: card.goldDiamond ? '#fbbf24' : '#94a3b8' }}>
                    {card.goldDiamond ? '\u25C6 Злато' : '\u25C6 Сребро'}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                {card.type !== 'haydut' && card.strength != null && (
                  <span className="text-xs text-amber-300">{'\u2694\uFE0F'}{card.strength}</span>
                )}
                {card.cost != null && (
                  <span className="text-xs text-amber-300">{'\u{1F4B0}'}{card.cost}</span>
                )}
                {contrib && (
                  <span className={`text-xs ${contrib.color}`}>{contrib.icon}{card.strength ?? ''}</span>
                )}
                {card.chetaPoints !== undefined && card.chetaPoints > 0 && (
                  <span className="text-xs text-amber-400">{'\u{1F3F3}\uFE0F'}{card.chetaPoints}</span>
                )}
                {(card.silverDiamond || card.goldDiamond) && (
                  <span style={{ fontSize: 9, color: card.goldDiamond ? '#fbbf24' : '#94a3b8' }}>
                    {card.goldDiamond ? '\u25C6 Злато' : '\u25C6 Сребро'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back */}
        <div className="card-face card-face-back w-full h-full rounded-lg overflow-hidden border-2 border-amber-700">
          <img src={CARD_BACK} alt="Card back" className="w-full h-full object-cover" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<GalleryTab>('hayduti');
  const [showRules, setShowRules] = useState(false);

  const tabCards: Record<GalleryTab, Card[]> = {
    hayduti: HAYDUTI_CARDS,
    voyvoda: VOYVODA_CARDS,
    deyets: DEYETS_CARDS,
    zaptie: ZAPTIE_CARDS,
  };

  const tabLabels: Record<GalleryTab, { label: string; count: number; color: string }> = {
    hayduti: { label: 'Хайдути', count: 48, color: 'text-emerald-400' },
    voyvoda: { label: 'Войводи', count: 17, color: 'text-amber-400' },
    deyets:  { label: 'Дейци',   count: 15, color: 'text-sky-400' },
    zaptie:  { label: 'Заптие',  count: 16, color: 'text-red-400' },
  };

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.17 0.025 55)' }}>
      {/* HERO SECTION */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Хайдути"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-[oklch(0.17_0.025_55)]" />

        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1
              className="font-cinzel text-6xl md:text-8xl font-black tracking-widest mb-3"
              style={{
                color: 'oklch(0.92 0.06 78)',
                textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 60px rgba(180,120,30,0.3)',
                letterSpacing: '0.15em',
              }}
            >
              ХАЙДУТИ
            </h1>
            <p
              className="font-lora text-lg md:text-xl italic mb-2"
              style={{ color: 'oklch(0.80 0.04 78)', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
            >
              Дигитална настолна игра за Българското Възраждане
            </p>
            <p
              className="font-source text-sm"
              style={{ color: 'oklch(0.65 0.03 70)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              2–6 играчи · Александър Торофиев
            </p>
          </motion.div>
        </div>
      </section>

      {/* ACTION BUTTONS */}
      <section className="relative z-10 -mt-8 flex flex-wrap justify-center gap-4 px-4">
        <motion.button
          onClick={() => navigate('/setup')}
          className="btn-action px-8 py-4 rounded-lg text-lg font-bold shadow-2xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {'\u2694\uFE0F'} Нова игра
        </motion.button>
        <motion.button
          onClick={() => navigate('/lobby')}
          className="px-6 py-4 rounded-lg text-base font-semibold font-cinzel border transition-all"
          style={{
            borderColor: 'oklch(0.45 0.10 148)',
            color: 'oklch(0.75 0.10 148)',
            background: 'oklch(0.22 0.04 148)',
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {'\u{1F310}'} Мултиплейър
        </motion.button>
        <motion.button
          onClick={() => setShowRules(!showRules)}
          className="px-6 py-4 rounded-lg text-base font-semibold font-cinzel border transition-all"
          style={{
            borderColor: 'oklch(0.45 0.06 55)',
            color: 'oklch(0.75 0.04 78)',
            background: 'oklch(0.22 0.03 55)',
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {'\u{1F4DC}'} Правила
        </motion.button>
      </section>

      {/* RULES PANEL */}
      <AnimatePresence>
        {showRules && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="rounded-xl border p-6 font-lora"
                style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)', color: 'oklch(0.85 0.03 75)' }}>
                <h2 className="font-cinzel text-2xl font-bold mb-4" style={{ color: 'oklch(0.72 0.12 78)' }}>
                  Правила на играта
                </h2>
                <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed">
                  <div>
                    <h3 className="font-cinzel font-semibold mb-2" style={{ color: 'oklch(0.65 0.10 148)' }}>Цел на играта</h3>
                    <p>Всеки играч ръководи таен революционен комитет, подготвящ хайдушка група. Победителят е играчът с най-много точки „Чета" в края.</p>
                  </div>
                  <div>
                    <h3 className="font-cinzel font-semibold mb-2" style={{ color: 'oklch(0.65 0.10 148)' }}>Показатели на комитета</h3>
                    <p><strong className="text-sky-400">Набор</strong> — броят карти в ръка. <strong className="text-amber-400">Дейност</strong> — броят действия за ход. <strong className="text-red-400">Бойна мощ</strong> — защита срещу Заптие.</p>
                  </div>
                  <div>
                    <h3 className="font-cinzel font-semibold mb-2" style={{ color: 'oklch(0.65 0.10 148)' }}>Ход на играча</h3>
                    <p><strong>1. Вербуване</strong> — Проучване, Сигурно или Рисковано вербуване.<br/>
                    <strong>2. Подбор</strong> — Задържи до Набор карти.<br/>
                    <strong>3. Сформиране</strong> — Образувай група за подобрение или издигане.<br/>
                    <strong>4. Край на хода</strong></p>
                  </div>
                  <div>
                    <h3 className="font-cinzel font-semibold mb-2" style={{ color: 'oklch(0.65 0.10 148)' }}>Среща с Заптие</h3>
                    <p>Ако комитетът е таен — разкрива се. Ако е разкрит и Бойна мощ на Заптиетата {'>'} твоята — комитетът е разбит и губиш всички карти.</p>
                  </div>
                  <div>
                    <h3 className="font-cinzel font-semibold mb-2" style={{ color: 'oklch(0.65 0.10 148)' }}>Сформиране на група</h3>
                    <p>Хайдутите трябва да са с еднакъв принос (Набор/Дейност/Бойна мощ) ИЛИ еднакъв цвят. Силата на групата = сбор от силите им.</p>
                  </div>
                  <div>
                    <h3 className="font-cinzel font-semibold mb-2" style={{ color: 'oklch(0.65 0.10 148)' }}>Точкуване</h3>
                    <p>Сбор от трите показателя + 5 точки за водачество в показател + точки „Чета" от Войводи и Дейци.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* CARD GALLERY */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1" style={{ background: 'oklch(0.35 0.04 55)' }} />
          <h2 className="font-cinzel text-2xl font-bold tracking-wider" style={{ color: 'oklch(0.72 0.12 78)' }}>
            Карти
          </h2>
          <div className="h-px flex-1" style={{ background: 'oklch(0.35 0.04 55)' }} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(Object.keys(tabLabels) as GalleryTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-cinzel text-sm font-semibold transition-all border ${
                activeTab === tab ? 'shadow-lg' : 'opacity-60 hover:opacity-80'
              }`}
              style={activeTab === tab ? {
                background: 'oklch(0.28 0.04 55)',
                borderColor: 'oklch(0.55 0.10 148)',
                color: 'oklch(0.90 0.02 80)',
              } : {
                background: 'oklch(0.20 0.03 55)',
                borderColor: 'oklch(0.30 0.03 55)',
                color: 'oklch(0.65 0.03 70)',
              }}
            >
              <span className={tabLabels[tab].color}>{tabLabels[tab].label}</span>
              <span className="ml-1 text-xs opacity-60">({tabLabels[tab].count})</span>
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-3 justify-start"
          >
            {tabCards[activeTab].map(card => (
              <CardDisplay key={card.id} card={card} />
            ))}
          </motion.div>
        </AnimatePresence>

      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 border-t" style={{ borderColor: 'oklch(0.25 0.03 55)', color: 'oklch(0.45 0.03 65)' }}>
        <p className="font-source text-sm">Хайдути &copy; Александър Торофиев · Издава Българска История</p>
      </footer>
    </div>
  );
}
