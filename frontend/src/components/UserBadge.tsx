import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

const HIDDEN_ROUTES = ['/login', '/register'];

export default function UserBadge() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!isAuthenticated || !user || HIDDEN_ROUTES.includes(location)) {
    return null;
  }

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-lg px-3 py-1.5 font-source text-sm"
      style={{ background: 'oklch(0.22 0.03 55 / 0.85)', border: '1px solid oklch(0.35 0.04 55)' }}
    >
      <span className="text-amber-200/60">
        Играч: <strong className="text-amber-200/90">{user.name}</strong>
      </span>
      <button
        onClick={async () => { await logout(); navigate('/login'); }}
        className="ml-1 text-xs text-amber-200/40 hover:text-amber-200/80 transition-colors"
      >
        Изход
      </button>
    </div>
  );
}
