export default function StatTrack({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const steps = [4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm w-4">{icon}</span>
      <div className="flex gap-0.5">
        {steps.map(v => (
          <div
            key={v}
            className="w-5 h-5 rounded-sm flex items-center justify-center"
            style={{
              background: v <= value ? color : 'oklch(0.25 0.03 55)',
              border: `1px solid ${v === value ? color : 'oklch(0.30 0.03 55)'}`,
              fontSize: 8,
              color: v <= value ? 'white' : 'oklch(0.45 0.03 65)',
              fontFamily: 'Cinzel, serif',
              fontWeight: 'bold',
            }}
          >
            {v}
          </div>
        ))}
      </div>
      <span className="font-cinzel text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
