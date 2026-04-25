import { useState, useEffect } from 'react';

export function useSession() {
  const [playerId, setPlayerId] = useState<number | null>(() => {
    const stored = localStorage.getItem('wizard_player_id');
    return stored ? parseInt(stored, 10) : null;
  });

  const setSession = (id: number) => {
    localStorage.setItem('wizard_player_id', id.toString());
    setPlayerId(id);
  };

  const clearSession = () => {
    localStorage.removeItem('wizard_player_id');
    setPlayerId(null);
  };

  return { playerId, setSession, clearSession };
}
