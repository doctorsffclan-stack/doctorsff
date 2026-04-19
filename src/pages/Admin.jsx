import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function Admin() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#07090E' }}>
      <div style={{ width:38,height:38,border:'3px solid rgba(167,139,250,.2)',borderTopColor:'#A78BFA',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // If logged in via Firebase Auth → show dashboard, session persists after refresh
  if (user) return <AdminDashboard />;
  return <AdminLogin />;
}
