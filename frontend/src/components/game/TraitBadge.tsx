import type { DeyetsTraitId } from '@shared/gameData';
import { TRAIT_META } from './constants';

export default function TraitBadge({ traitId }: { traitId: DeyetsTraitId }) {
  const meta = TRAIT_META[traitId];
  return (
    <div
      className="group relative"
      title={`${meta.label}: ${meta.shortDesc}`}
    >
      <span
        className="text-xs px-1.5 py-0.5 rounded font-source cursor-help"
        style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
      >
        {meta.icon} {meta.label.split(' ')[0]}
      </span>
    </div>
  );
}
