import { registerRule } from '../rule-registry';
import { ContributionType } from '../../../types/card';
import { popHaritonFormEffects, popHaritonSkipEffects } from '../helpers/group-helpers';

registerRule({
  id: 'pop-hariton-form',
  priority: 40,
  when: ({ state, action }) => action.type === 'POP_HARITON_FORM_GROUP' && state.popHaritonForming,
  execute: ({ state, action }) => {
    const statType = (action as unknown as { statType: ContributionType }).statType;
    return popHaritonFormEffects(state, statType);
  },
});

registerRule({
  id: 'pop-hariton-skip',
  priority: 40,
  when: ({ state, action }) => action.type === 'POP_HARITON_SKIP' && state.popHaritonForming,
  execute: ({ state }) => popHaritonSkipEffects(state),
});
