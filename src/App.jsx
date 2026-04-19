import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register/:tournamentId" element={<Register />} />
            <Route path="/x9admin-panel" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TournamentProvider>
    </AuthProvider>
  );
}
