// ХАЙДУТИ — Login Page
import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { login } from '@/api/auth';
import { BANNER_IMG } from "@/components/game/constants";

export default function Login() {
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      await refresh();
      navigate('/lobby');
    } catch (err: any) {
      setError(err?.message ?? 'Грешка при вход');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(0.17 0.025 55)' }}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={BANNER_IMG}
          alt=""
          className="w-full h-full object-cover object-top opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[oklch(0.17_0.025_55)]" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1
              className="font-cinzel text-5xl font-black tracking-widest mb-1"
              style={{ color: 'oklch(0.92 0.06 78)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
            >
              ХАЙДУТИ
            </h1>
            <p className="font-lora text-sm italic" style={{ color: 'oklch(0.65 0.04 78)' }}>
              Дигитална настолна игра за Българското Възраждане
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl border p-8"
            style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)' }}
          >
            <h2 className="font-cinzel text-xl font-bold mb-6 text-center" style={{ color: 'oklch(0.88 0.04 80)' }}>
              Вход
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-source text-xs text-amber-200/60 mb-1" htmlFor="email">
                  Имейл
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg font-source text-sm outline-none transition-all"
                  style={{
                    background: 'oklch(0.17 0.025 55)',
                    border: '1px solid oklch(0.40 0.05 55)',
                    color: 'oklch(0.90 0.02 80)',
                  }}
                  placeholder="потребител@пример.бг"
                />
              </div>

              <div>
                <label className="block font-source text-xs text-amber-200/60 mb-1" htmlFor="password">
                  Парола
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg font-source text-sm outline-none transition-all"
                  style={{
                    background: 'oklch(0.17 0.025 55)',
                    border: '1px solid oklch(0.40 0.05 55)',
                    color: 'oklch(0.90 0.02 80)',
                  }}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="font-source text-xs text-red-400 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-cinzel font-bold text-sm transition-all disabled:opacity-50 mt-2"
                style={{ background: 'oklch(0.45 0.12 148)', color: 'oklch(0.95 0.02 80)' }}
              >
                {loading ? 'Влизане...' : '⚔️ Вход'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="font-source text-xs" style={{ color: 'oklch(0.55 0.03 70)' }}>
                Нямаш профил?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="underline transition-colors"
                  style={{ color: 'oklch(0.72 0.10 148)' }}
                >
                  Регистрирай се
                </button>
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="font-source text-xs transition-colors"
              style={{ color: 'oklch(0.50 0.03 70)' }}
            >
              ← Обратно към началото
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
