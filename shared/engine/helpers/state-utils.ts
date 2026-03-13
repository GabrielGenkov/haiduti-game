import { GameState, GameNotification } from '../../types/state';
import { Player } from '../../types/player';
import { Card, DeyetsTraitId } from '../../types/card';

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function withCurrentPlayer(state: GameState, updater: (player: Player) => Player): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.currentPlayerIndex ? updater(player) : player
    ),
  };
}

export function pushNotification(
  state: GameState,
  text: string,
  kind: GameNotification['kind'] = 'info'
): GameState {
  const notification: GameNotification = {
    id: `${Date.now()}-${state.notifications.length}`,
    kind,
    text,
  };
  return {
    ...state,
    message: text,
    notifications: [...state.notifications, notification],
  };
}

export function getSelectedHayduti(player: Player, selectedCards: string[]): Card[] {
  return player.hand.filter(card => selectedCards.includes(card.id) && card.type === 'haydut');
}

export function getDeyetsTraitId(cardId: string): DeyetsTraitId | null {
  const map: Record<string, DeyetsTraitId> = {
    dey_hristo: 'hristo_botev',
    dey_vasil: 'vasil_levski',
    dey_sofroniy: 'sofroniy',
    dey_rakowski: 'rakowski',
    dey_evlogi: 'evlogi',
    dey_petko_voy: 'petko_voy',
    dey_lyuben: 'lyuben',
    dey_rayna: 'rayna',
    dey_benkovski: 'benkovski',
    dey_pop: 'pop_hariton',
    dey_hadzhi: 'hadzhi',
    dey_dyado: 'dyado_ilyo',
    dey_filip: 'filip_totyu',
    dey_panayot: 'panayot',
    dey_stefan: 'stefan_karadzha',
  };
  return map[cardId] ?? null;
}
