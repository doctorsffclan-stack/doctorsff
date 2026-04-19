import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

const TCtx = createContext();
export const useTournaments = () => useContext(TCtx);

export function TournamentProvider({ children }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'tournaments'), snap => {
      setTournaments(snap.exists() ? (snap.data().list || []) : []);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Only registration-open tournaments visible to public
  const activeTournaments = tournaments.filter(t =>
    t.status === 'registration' || t.status === 'paused'
  );

  return (
    <TCtx.Provider value={{ tournaments, activeTournaments, loading }}>
      {children}
    </TCtx.Provider>
  );
}
