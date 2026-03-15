// Side-effect imports: register all rules
import './core/ui';
import './core/forming';
import './core/turn-flow';
import './core/selection';
import './core/abilities';
import './core/recruiting';
import './core/zaptie';
import './core/panayot';
import './core/pop-hariton';
import './core/decisions';

export { dispatchAction } from './rule-dispatcher';
export { registerRule, getAllRules } from './rule-registry';
export type { Rule, RuleContext } from './rule';
