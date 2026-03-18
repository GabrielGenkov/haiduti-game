import { GameState } from "@shared/types";
import { Card } from '../types/card';

export interface ZoneCounts {
  deck: number;
  field: number;
  sideField: number;
  usedCards: number;
  hands: number;
  raisedVoyvodas: number;
  raisedDeytsi: number;
  total: number;
}

export interface DiagnosticResult {
  counts: ZoneCounts;
  expected: number;
  valid: boolean;
  duplicateIds: string[];
  warnings: string[];
  details: {
    perPlayer: { name: string; hand: number; voyvodas: number; deytsi: number }[];
    fieldFaceUp: number;
    fieldFaceDown: number;
    fieldEmpty: number;
    sideFieldFaceUp: number;
    sideFieldFaceDown: number;
    sideFieldEmpty: number;
    deckRotations: number;
  };
}

function expectedCardCount(deckRotations: number): number {
  // Regular cards (no diamonds)
  let count = 84;
  if (deckRotations >= 1) count += 6; // silver diamonds added at rotation 1
  if (deckRotations >= 2) count += 6; // gold diamonds added at rotation 2
  return count;
}

export function diagnoseGameState(state: GameState): DiagnosticResult {
  const warnings: string[] = [];

  // Count cards in each zone
  const deckCount = state.deck.length;
  const fieldCount = state.field.filter(c => c !== null).length;
  const sideFieldCount = state.sideField.filter(c => c !== null).length;
  const usedCardsCount = state.usedCards.length;

  let handsCount = 0;
  let voyvodasCount = 0;
  let deytsiCount = 0;
  const perPlayer: DiagnosticResult['details']['perPlayer'] = [];

  for (const p of state.players) {
    handsCount += p.hand.length;
    voyvodasCount += p.raisedVoyvodas.length;
    deytsiCount += p.raisedDeytsi.length;
    perPlayer.push({
      name: p.name,
      hand: p.hand.length,
      voyvodas: p.raisedVoyvodas.length,
      deytsi: p.raisedDeytsi.length,
    });
  }

  const total = deckCount + fieldCount + sideFieldCount + usedCardsCount + handsCount + voyvodasCount + deytsiCount;
  const expected = expectedCardCount(state.deckRotations);

  // Check for duplicate IDs
  const allIds: string[] = [];
  allIds.push(...state.deck.map(c => c.id));
  allIds.push(...state.field.filter((c): c is Card => c !== null).map(c => c.id));
  allIds.push(...state.sideField.filter((c): c is Card => c !== null).map(c => c.id));
  allIds.push(...state.usedCards.map(c => c.id));
  for (const p of state.players) {
    allIds.push(...p.hand.map(c => c.id));
    allIds.push(...p.raisedVoyvodas.map(c => c.id));
    allIds.push(...p.raisedDeytsi.map(c => c.id));
  }

  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const id of allIds) {
    if (seen.has(id)) duplicateIds.push(id);
    seen.add(id);
  }

  // Validate
  if (total !== expected) {
    warnings.push(`Card count mismatch: total=${total}, expected=${expected} (rotations=${state.deckRotations})`);
  }
  if (duplicateIds.length > 0) {
    warnings.push(`Duplicate card IDs: ${duplicateIds.join(', ')}`);
  }

  // Parallel array checks
  if (state.fieldFaceUp.length !== state.field.length) {
    warnings.push(`fieldFaceUp.length (${state.fieldFaceUp.length}) !== field.length (${state.field.length})`);
  }
  if (state.sideFieldFaceUp.length !== state.sideField.length) {
    warnings.push(`sideFieldFaceUp.length (${state.sideFieldFaceUp.length}) !== sideField.length (${state.sideField.length})`);
  }

  // Zapties in hand check
  for (let i = 0; i < state.players.length; i++) {
    const zapties = state.players[i].hand.filter(c => c.type === 'zaptie');
    if (zapties.length > 0) {
      warnings.push(`Player ${i} (${state.players[i].name}) has ${zapties.length} zaptie(s) in hand`);
    }
  }

  // Field/sideField face-up stats
  let fieldFaceUp = 0, fieldFaceDown = 0, fieldEmpty = 0;
  for (let i = 0; i < state.field.length; i++) {
    if (state.field[i] === null) fieldEmpty++;
    else if (state.fieldFaceUp[i]) fieldFaceUp++;
    else fieldFaceDown++;
  }

  let sideFieldFaceUp = 0, sideFieldFaceDown = 0, sideFieldEmpty = 0;
  for (let i = 0; i < state.sideField.length; i++) {
    if (state.sideField[i] === null) sideFieldEmpty++;
    else if (state.sideFieldFaceUp[i]) sideFieldFaceUp++;
    else sideFieldFaceDown++;
  }

  return {
    counts: {
      deck: deckCount,
      field: fieldCount,
      sideField: sideFieldCount,
      usedCards: usedCardsCount,
      hands: handsCount,
      raisedVoyvodas: voyvodasCount,
      raisedDeytsi: deytsiCount,
      total,
    },
    expected,
    valid: warnings.length === 0,
    duplicateIds,
    warnings,
    details: {
      perPlayer,
      fieldFaceUp,
      fieldFaceDown,
      fieldEmpty,
      sideFieldFaceUp,
      sideFieldFaceDown,
      sideFieldEmpty,
      deckRotations: state.deckRotations,
    },
  };
}

/**
 * Format diagnostic result as a compact log string.
 */
export function formatDiagnosticLog(diag: DiagnosticResult, label: string): string {
  const c = diag.counts;
  const d = diag.details;

  const lines = [
    `[DIAG ${label}] Cards: deck=${c.deck} field=${c.field}(↑${d.fieldFaceUp} ↓${d.fieldFaceDown} ∅${d.fieldEmpty}) side=${c.sideField}(↑${d.sideFieldFaceUp} ↓${d.sideFieldFaceDown} ∅${d.sideFieldEmpty}) discard=${c.usedCards} hands=${c.hands} voy=${c.raisedVoyvodas} dey=${c.raisedDeytsi} | total=${c.total}/${diag.expected} rot=${d.deckRotations}`,
  ];

  for (const p of d.perPlayer) {
    lines.push(`  ${p.name}: hand=${p.hand} voy=${p.voyvodas} dey=${p.deytsi}`);
  }

  if (!diag.valid) {
    for (const w of diag.warnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }

  return lines.join('\n');
}

function cardLabel(c: Card): string {
  const parts = [c.id, c.name, c.type];
  if (c.strength != null) parts.push(`str:${c.strength}`);
  if (c.contribution) parts.push(c.contribution);
  if (c.color) parts.push(c.color);
  if (c.silverDiamond) parts.push('silver');
  if (c.goldDiamond) parts.push('gold');
  return parts.join(' ');
}

/**
 * Format a fully detailed diagnostic log listing every card in every zone.
 */
export function formatDetailedDiagnosticLog(state: GameState, label: string): string {
  const diag = diagnoseGameState(state);
  const c = diag.counts;
  const d = diag.details;

  const lines = [
    `[DIAG ${label}] total=${c.total}/${diag.expected} rot=${d.deckRotations}`,
  ];

  // Deck
  lines.push(`  DECK (${state.deck.length}):`);
  for (const card of state.deck) {
    lines.push(`    ${cardLabel(card)}`);
  }

  // Field 4x4
  lines.push(`  FIELD (${c.field} cards, ${d.fieldEmpty} empty):`);
  for (let i = 0; i < state.field.length; i++) {
    const card = state.field[i];
    if (card === null) {
      lines.push(`    [${i}] (empty)`);
    } else {
      const faceUp = state.fieldFaceUp[i];
      lines.push(`    [${i}] ${cardLabel(card)}${faceUp ? ' (turned up)' : ''}`);
    }
  }

  // Side field
  if (state.sideField.length > 0) {
    lines.push(`  SIDE FIELD (${c.sideField} cards, ${d.sideFieldEmpty} empty):`);
    for (let i = 0; i < state.sideField.length; i++) {
      const card = state.sideField[i];
      if (card === null) {
        lines.push(`    [${i}] (empty)`);
      } else {
        const faceUp = state.sideFieldFaceUp[i];
        lines.push(`    [${i}] ${cardLabel(card)}${faceUp ? ' (turned up)' : ''}`);
      }
    }
  }

  // Per-player hands, raised voyvodas, raised deytsi
  for (const p of state.players) {
    lines.push(`  PLAYER "${p.name}":`);
    lines.push(`    Hand (${p.hand.length}):`);
    for (const card of p.hand) {
      lines.push(`      ${cardLabel(card)}`);
    }
    if (p.raisedVoyvodas.length > 0) {
      lines.push(`    Raised Voyvodas (${p.raisedVoyvodas.length}):`);
      for (const card of p.raisedVoyvodas) {
        lines.push(`      ${cardLabel(card)}`);
      }
    }
    if (p.raisedDeytsi.length > 0) {
      lines.push(`    Raised Deytsi (${p.raisedDeytsi.length}):`);
      for (const card of p.raisedDeytsi) {
        lines.push(`      ${cardLabel(card)}`);
      }
    }
  }

  // Discard pile
  lines.push(`  DISCARD (${state.usedCards.length}):`);
  for (const card of state.usedCards) {
    lines.push(`    ${cardLabel(card)}`);
  }

  // Warnings
  if (!diag.valid) {
    lines.push(`  WARNINGS:`);
    for (const w of diag.warnings) {
      lines.push(`    ⚠ ${w}`);
    }
  }

  return lines.join('\n');
}
