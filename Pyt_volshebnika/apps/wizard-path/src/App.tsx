import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFoundPage from "@/pages/NotFoundPage";
import { audioManager } from "@/lib/audio";

import IntroPage from "./pages/IntroPage";
import AuthPage from "./pages/AuthPage";
import GameScreen from "./pages/GameScreen";
import { useSession } from "./hooks/use-session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Home() {
  const { playerId } = useSession();

  useEffect(() => {
    const startAudio = () => { audioManager.startBgMusic(); };
    window.addEventListener('click', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });
    return () => {
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
  }, []);
  
  useEffect(() => {
    if (playerId) {
      window.location.href = import.meta.env.BASE_URL + "game";
    } else {
      window.location.href = import.meta.env.BASE_URL + "intro";
    }
  }, [playerId]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/intro" component={IntroPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/game" component={GameScreen} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
