import { CARD_BACK } from './constants';

export default function CardBack() {
  return (
    <div className="rounded-lg overflow-hidden border border-amber-800/60 shadow-md flex-shrink-0"
      style={{ width: 100, height: 156 }}>
      <img src={CARD_BACK} alt="Card back" className="w-full h-full object-cover" />
    </div>
  );
}
