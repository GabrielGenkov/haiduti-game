// Import all traits to trigger registration
import './hristo-botev';
import './vasil-levski';
import './sofroniy';
import './rakowski';
import './evlogi';
import './filip-totyu';
import './stefan-karadzha';
import './lyuben';
import './rayna';
import './benkovski';
import './petko-voy';
import './pop-hariton';
import './hadzhi';
import './dyado-ilyo';
import './panayot';

export type { TraitStrategy } from './trait-registry';
export {
  registerTrait,
  getTrait,
  getActiveTraits,
  getTraitGroupBonus,
  getTraitRaiseBonus,
  applyGroupFormedTraits,
} from './trait-registry';
