// ХАЙДУТИ — App Router

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/NotFound';
import { Route, Switch } from 'wouter';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import Lobby from './pages/Lobby';
import WaitingRoom from './pages/WaitingRoom';
import MultiplayerGame from './pages/MultiplayerGame';

// Local pass-and-play game wrapper (no props needed)
import GameLocal from './pages/Game';
function LocalGame() {
  return <GameLocal />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/setup" component={Setup} />
      <Route path="/game" component={LocalGame} />
      <Route path="/lobby" component={Lobby} />
      <Route path="/room/:code" component={WaitingRoom} />
      <Route path="/game/:code" component={MultiplayerGame} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
