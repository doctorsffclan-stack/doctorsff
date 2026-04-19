import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in AuthContext handles redirect
    } catch {
      setError('إيميل أو كلمة السر غلط');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
        <div className={styles.icon}>🔐</div>
        <h1 className={styles.title}>لوحة الإدارة</h1>
        <p className={styles.sub}>DOCTORS Tournament Admin</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <input
            type="email" className={styles.input} placeholder="الإيميل"
            value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
            autoFocus autoComplete="username"
          />
          <input
            type="password" className={`${styles.input} ${error ? styles.inputErr : ''}`}
            placeholder="كلمة السر"
            value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
            autoComplete="current-password"
          />
          {error && <span className={styles.error}>{error}</span>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? <span className={styles.ring}/> : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
