import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getLoginUrl } from '@/const';
import { toast } from 'sonner';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663406922472/2gR6Yf82SmCj2Vzvaty3Kv/haiduti-hero-MngQ2SPQRSJ3spU3uVxSan.webp';

const GAME_LENGTH_LABELS: Record<string, string> = {
  short: 'Кратка (2 ротации)',
  medium: 'Нормална (3 ротации)',
  long: 'Дълга (4 ротации)',
};

export default function Lobby() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [gameLength, setGameLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const { data: rooms, refetch: refetchRooms } = trpc.rooms.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: (data) => {
      navigate(`/room/${data.room.code}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const joinMutation = trpc.rooms.join.useMutation({
    onSuccess: (data) => {
      navigate(`/room/${data.room.code}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.17 0.025 55)' }}>
        <div className="font-cinzel text-amber-300 text-xl animate-pulse">Зареждане...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ background: 'oklch(0.17 0.025 55)' }}>
        <h1 className="font-cinzel text-4xl font-black text-amber-300">ХАЙДУТИ</h1>
        <p className="font-lora text-amber-200/80 text-center max-w-sm">
          Влез в профила си, за да създадеш или се присъединиш към стая за игра.
        </p>
        <a
          href={getLoginUrl()}
          className="px-8 py-3 rounded-lg font-cinzel font-bold text-lg transition-all"
          style={{ background: 'oklch(0.45 0.12 148)', color: 'oklch(0.95 0.02 80)' }}
        >
          Вход / Регистрация
        </a>
        <button
          onClick={() => navigate('/')}
          className="font-source text-sm text-amber-200/50 hover:text-amber-200/80 transition-colors"
        >
          ← Обратно към началото
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.17 0.025 55)' }}>
      {/* Header */}
      <div className="relative h-32 overflow-hidden">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[oklch(0.17_0.025_55)]" />
        <div className="relative h-full flex items-center justify-between px-6">
          <button onClick={() => navigate('/')} className="font-cinzel text-amber-300/70 hover:text-amber-300 text-sm transition-colors">
            ← Начало
          </button>
          <h1 className="font-cinzel text-3xl font-black tracking-widest" style={{ color: 'oklch(0.92 0.06 78)' }}>
            ЛОБИ
          </h1>
          <div className="font-source text-sm text-amber-200/60">
            {user?.name}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
        {/* Left: Create or Join */}
        <div className="space-y-4">
          {/* Join by code */}
          <div className="rounded-xl border p-5" style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)' }}>
            <h2 className="font-cinzel text-lg font-bold mb-3" style={{ color: 'oklch(0.72 0.12 78)' }}>
              Присъедини се към стая
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Код на стаята"
                maxLength={6}
                className="flex-1 px-3 py-2 rounded-lg font-cinzel text-sm font-bold tracking-widest uppercase"
                style={{ background: 'oklch(0.28 0.03 55)', border: '1px solid oklch(0.40 0.05 55)', color: 'oklch(0.90 0.02 80)' }}
              />
              <button
                onClick={() => {
                  if (joinCode.length < 4) { toast.error('Въведи валиден код'); return; }
                  joinMutation.mutate({ code: joinCode });
                }}
                disabled={joinMutation.isPending}
                className="px-4 py-2 rounded-lg font-cinzel text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'oklch(0.45 0.12 148)', color: 'oklch(0.95 0.02 80)' }}
              >
                {joinMutation.isPending ? '...' : 'Влез'}
              </button>
            </div>
          </div>

          {/* Create room */}
          <div className="rounded-xl border p-5" style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)' }}>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="w-full flex items-center justify-between font-cinzel text-lg font-bold"
              style={{ color: 'oklch(0.72 0.12 78)' }}
            >
              <span>Създай нова стая</span>
              <span>{showCreate ? '▲' : '▼'}</span>
            </button>

            {showCreate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="block font-source text-xs text-amber-200/60 mb-1">Име на стаята</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder={`Стаята на ${user?.name ?? 'Играч'}`}
                    maxLength={64}
                    className="w-full px-3 py-2 rounded-lg font-source text-sm"
                    style={{ background: 'oklch(0.28 0.03 55)', border: '1px solid oklch(0.40 0.05 55)', color: 'oklch(0.90 0.02 80)' }}
                  />
                </div>

                <div>
                  <label className="block font-source text-xs text-amber-200/60 mb-1">Дължина на играта</label>
                  <div className="flex gap-2">
                    {(['short', 'medium', 'long'] as const).map(gl => (
                      <button
                        key={gl}
                        onClick={() => setGameLength(gl)}
                        className="flex-1 py-2 rounded-lg font-cinzel text-xs font-semibold transition-all border"
                        style={gameLength === gl ? {
                          background: 'oklch(0.35 0.08 148)',
                          borderColor: 'oklch(0.55 0.12 148)',
                          color: 'oklch(0.95 0.02 80)',
                        } : {
                          background: 'oklch(0.25 0.03 55)',
                          borderColor: 'oklch(0.35 0.04 55)',
                          color: 'oklch(0.65 0.03 70)',
                        }}
                      >
                        {gl === 'short' ? 'Кратка' : gl === 'medium' ? 'Нормална' : 'Дълга'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-source text-xs text-amber-200/60 mb-1">Макс. играчи: {maxPlayers}</label>
                  <input
                    type="range" min={2} max={6} value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between font-source text-xs text-amber-200/40 mt-0.5">
                    <span>2</span><span>6</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const name = roomName.trim() || `Стаята на ${user?.name ?? 'Играч'}`;
                    createMutation.mutate({ name, gameLength, maxPlayers });
                  }}
                  disabled={createMutation.isPending}
                  className="w-full py-3 rounded-lg font-cinzel font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'oklch(0.50 0.14 55)', color: 'oklch(0.95 0.02 80)' }}
                >
                  {createMutation.isPending ? 'Създаване...' : '⚔️ Създай стая'}
                </button>
              </motion.div>
            )}
          </div>

          {/* Solo / local play */}
          <div className="rounded-xl border p-5" style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)' }}>
            <h2 className="font-cinzel text-lg font-bold mb-2" style={{ color: 'oklch(0.72 0.12 78)' }}>
              Локална игра
            </h2>
            <p className="font-source text-xs text-amber-200/60 mb-3">
              Играй на едно устройство без интернет (pass-and-play).
            </p>
            <button
              onClick={() => navigate('/setup')}
              className="w-full py-2 rounded-lg font-cinzel text-sm font-semibold border transition-all hover:opacity-90"
              style={{ borderColor: 'oklch(0.45 0.06 55)', color: 'oklch(0.75 0.04 78)', background: 'oklch(0.25 0.03 55)' }}
            >
              📱 Pass-and-Play
            </button>
          </div>
        </div>

        {/* Right: Open rooms list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-cinzel text-lg font-bold" style={{ color: 'oklch(0.72 0.12 78)' }}>
              Отворени стаи
            </h2>
            <button
              onClick={() => refetchRooms()}
              className="font-source text-xs text-amber-200/50 hover:text-amber-200/80 transition-colors"
            >
              ↻ Обнови
            </button>
          </div>

          {!rooms || rooms.length === 0 ? (
            <div className="rounded-xl border p-8 text-center" style={{ background: 'oklch(0.20 0.025 55)', borderColor: 'oklch(0.30 0.03 55)' }}>
              <p className="font-source text-sm text-amber-200/40">Няма отворени стаи</p>
              <p className="font-source text-xs text-amber-200/30 mt-1">Създай нова стая или изчакай приятел</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map(room => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border p-4 flex items-center justify-between"
                  style={{ background: 'oklch(0.22 0.03 55)', borderColor: 'oklch(0.35 0.04 55)' }}
                >
                  <div>
                    <div className="font-cinzel text-sm font-bold" style={{ color: 'oklch(0.88 0.04 80)' }}>
                      {room.name}
                    </div>
                    <div className="font-source text-xs text-amber-200/50 mt-0.5">
                      {GAME_LENGTH_LABELS[room.gameLength]} · до {room.maxPlayers} играчи
                    </div>
                    <div className="font-cinzel text-xs font-bold tracking-widest mt-1" style={{ color: 'oklch(0.65 0.10 148)' }}>
                      {room.code}
                    </div>
                  </div>
                  <button
                    onClick={() => joinMutation.mutate({ code: room.code })}
                    disabled={joinMutation.isPending}
                    className="px-4 py-2 rounded-lg font-cinzel text-xs font-bold transition-all disabled:opacity-50"
                    style={{ background: 'oklch(0.45 0.12 148)', color: 'oklch(0.95 0.02 80)' }}
                  >
                    Влез
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
