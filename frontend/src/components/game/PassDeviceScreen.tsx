import { motion } from 'framer-motion';

export default function PassDeviceScreen({ playerName, color, onReady }: { playerName: string; color: string; onReady: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'oklch(0.10 0.02 55)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-8">
        <div className="text-6xl mb-6">📱</div>
        <h2 className="font-cinzel text-3xl font-bold mb-3" style={{ color }}>
          {playerName}
        </h2>
        <p className="font-source text-lg mb-8" style={{ color: 'oklch(0.65 0.03 70)' }}>
          Подай устройството на следващия играч
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReady}
          className="px-8 py-3 rounded-xl font-cinzel text-lg font-semibold border-2 transition-all"
          style={{ borderColor: color, color, background: 'oklch(0.15 0.02 55)' }}
        >
          Готов съм
        </motion.button>
      </motion.div>
    </div>
  );
}
