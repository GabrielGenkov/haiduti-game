import assert from 'node:assert/strict';

import { ALL_CARDS, Card, createInitialGameState, GameState } from '@shared/gameData';
import { gameReducer } from '@shared/gameEngine';

function getCard(id: string): Card {
  const card = ALL_CARDS.find(candidate => candidate.id === id);
  if (!card) throw new Error(`Missing card ${id}`);
  return card;
}

function blankState(): GameState {
  return {
    ...createInitialGameState(['Player 1', 'Player 2'], 'short'),
    deck: [],
    field: [],
    fieldFaceUp: [],
    sideField: [],
    sideFieldFaceUp: [],
    usedCards: [],
    notifications: [],
    message: '',
    selectedCards: [],
    pendingDecision: undefined,
    pendingGroup: undefined,
    defeatContext: undefined,
    zaptieTrigger: undefined,
    panayotTrigger: undefined,
    popHaritonForming: false,
    deckExhausted: false,
    gameEndsAfterTurn: false,
  };
}

function withPlayer(
  state: GameState,
  playerIndex: number,
  update: (player: GameState['players'][number]) => GameState['players'][number]
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) => (index === playerIndex ? update(player) : player)),
  };
}

function runTest(name: string, test: () => void): void {
  test();
  console.log(`PASS ${name}`);
}

runTest('risky recruit with Vasil Levski ignores the first zaptie and still stops the turn', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    traits: ['vasil_levski'],
  }));
  state = {
    ...state,
    deck: [getCard('zap_1')],
  };

  state = gameReducer(state, { type: 'RISKY_RECRUIT' });

  assert.equal(state.pendingDecision, undefined);
  assert.equal(state.turnStep, 'selection');
  assert.equal(state.actionsRemaining, 0);
  assert.equal(state.players[0].zaptieTurnIgnored, true);
  assert.deepEqual(state.sideField.filter(c => c !== null).map(card => card.id), ['zap_1']);
});

runTest('Vasil Levski and Dyado Ilyo open an explicit choice when the same zaptie is revealed', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    traits: ['vasil_levski', 'dyado_ilyo'],
  }));
  state = {
    ...state,
    field: [getCard('zap_1')],
    fieldFaceUp: [false],
  };

  state = gameReducer(state, { type: 'SCOUT', fieldIndex: 0 });

  assert.equal(state.pendingDecision?.kind, 'trait_choice');
  assert.deepEqual([...(state.pendingDecision?.options ?? [])].sort(), ['dyado_ilyo', 'vasil_levski']);
});

runTest('Pop Hariton takes priority over Petko Voyvoda after defeat', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    isRevealed: true,
    stats: { ...player.stats, boyna: 0 },
    traits: ['pop_hariton', 'petko_voy'],
    hand: [
      getCard('haydut_green_nabor_2_0'),
      getCard('haydut_blue_nabor_2_0'),
      getCard('voy_1'),
    ],
  }));
  state = {
    ...state,
    field: [getCard('zap_1')],
    fieldFaceUp: [false],
  };

  state = gameReducer(state, { type: 'SCOUT', fieldIndex: 0 });

  assert.equal(state.turnStep, 'forming');
  assert.equal(state.popHaritonForming, true);
  assert.equal(state.pendingDecision, undefined);

  state = gameReducer(state, { type: 'POP_HARITON_SKIP' });

  assert.equal(state.pendingDecision?.kind, 'card_choice');
  assert.equal(state.pendingDecision?.purpose, 'petko_keep');
  assert.equal(state.pendingDecision?.ownerPlayerIndex, 0);
});

runTest('Panayot Hitov decision ownership transfers to the beneficiary player', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    isRevealed: true,
    stats: { ...player.stats, boyna: 0 },
    hand: [
      getCard('haydut_green_nabor_2_0'),
      getCard('haydut_blue_nabor_2_0'),
      getCard('voy_1'),
    ],
  }));
  state = withPlayer(state, 1, player => ({
    ...player,
    traits: ['panayot'],
  }));
  state = {
    ...state,
    field: [getCard('zap_1')],
    fieldFaceUp: [false],
  };

  state = gameReducer(state, { type: 'SCOUT', fieldIndex: 0 });

  assert.equal(state.pendingDecision?.kind, 'card_choice');
  assert.equal(state.pendingDecision?.purpose, 'panayot_take');
  assert.equal(state.pendingDecision?.ownerPlayerIndex, 1);
  assert.equal(state.panayotTrigger?.beneficiaryPlayerIndex, 1);
});

runTest('Rakowski converts valid group formation into a keep-card decision', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    traits: ['rakowski'],
    hand: [
      getCard('haydut_green_nabor_2_0'),
      getCard('haydut_blue_nabor_2_0'),
    ],
  }));
  state = {
    ...state,
    turnStep: 'forming',
    selectedCards: ['haydut_green_nabor_2_0', 'haydut_blue_nabor_2_0'],
  };

  state = gameReducer(state, { type: 'FORM_GROUP_IMPROVE_STAT', statType: 'nabor' });

  assert.equal(state.pendingDecision?.kind, 'card_choice');
  assert.equal(state.pendingDecision?.purpose, 'rakowski_keep');
  assert.equal(state.pendingGroup?.purpose, 'improve_stat');
});

runTest('Color groups that can raise a leader request an explicit contribution choice', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    hand: [
      getCard('haydut_green_nabor_3_0'),
      getCard('haydut_green_deynost_3_0'),
      getCard('dey_sofroniy'),
    ],
  }));
  state = {
    ...state,
    turnStep: 'forming',
    selectedCards: ['haydut_green_nabor_3_0', 'haydut_green_deynost_3_0'],
  };

  state = gameReducer(state, { type: 'FORM_GROUP_RAISE_CARD', targetCardId: 'dey_sofroniy' });

  assert.equal(state.pendingDecision?.kind, 'contribution_choice');
  assert.deepEqual([...(state.pendingDecision?.selectableContributions ?? [])].sort(), ['deynost', 'nabor']);
});

runTest('Raising Lyuben opens a stat-choice decision after the leader is raised', () => {
  let state = blankState();
  state = withPlayer(state, 0, player => ({
    ...player,
    hand: [
      getCard('haydut_green_nabor_3_0'),
      getCard('haydut_blue_nabor_3_0'),
      getCard('haydut_red_nabor_3_0'),
      getCard('dey_lyuben'),
    ],
  }));
  state = {
    ...state,
    turnStep: 'forming',
    selectedCards: [
      'haydut_green_nabor_3_0',
      'haydut_blue_nabor_3_0',
      'haydut_red_nabor_3_0',
    ],
  };

  state = gameReducer(state, { type: 'FORM_GROUP_RAISE_CARD', targetCardId: 'dey_lyuben' });

  assert.equal(state.pendingDecision?.kind, 'stat_choice');
  assert.equal(state.players[0].raisedDeytsi.some(card => card.id === 'dey_lyuben'), true);
});

runTest('Final deck exhaustion ends the game after the turn, not immediately', () => {
  let state = blankState();
  state = {
    ...state,
    maxRotations: 1,
    deckRotations: 0,
    deck: [],
    usedCards: [],
  };

  state = gameReducer(state, { type: 'RISKY_RECRUIT' });

  assert.equal(state.phase, 'playing');
  assert.equal(state.deckExhausted, true);
  assert.equal(state.gameEndsAfterTurn, true);

  state = gameReducer({ ...state, turnStep: 'end' }, { type: 'END_TURN' });

  assert.equal(state.phase, 'scoring');
});

console.log('Engine regression tests passed.');
