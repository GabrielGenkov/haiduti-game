import { CARD_BACK } from './constants';

export default function CardBack({ small = false }: { small?: boolean }) {
  return (
    <div className="rounded-lg overflow-hidden border border-amber-800/60 shadow-md flex-shrink-0"
      style={{ width: small ? 56 : 80, height: small ? 88 : 128 }}>
      <img src={CARD_BACK} alt="Card back" className="w-full h-full object-cover" />
    </div>
  );
}
