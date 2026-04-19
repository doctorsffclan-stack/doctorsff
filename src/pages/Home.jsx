import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournaments } from '../context/TournamentContext';
import styles from './Home.module.css';

const DAY_NAMES = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

function getDeadlineInfo(registrationStart) {
  if (!registrationStart) return null;
  const start    = new Date(registrationStart);
  const deadline = new Date(start); deadline.setDate(deadline.getDate() + 2);
  const tourney  = new Date(deadline); tourney.setDate(tourney.getDate() + 1);
  return {
    deadlineDay: DAY_NAMES[deadline.getDay()],
    tourneyDay:  DAY_NAMES[tourney.getDay()],
  };
}

const TYPE_LABELS = { solo: 'السولو', duo: 'الثنائي', quad: 'الرباعي (4)' };

export default function Home() {
  const { activeTournaments, loading } = useTournaments();
  const navigate = useNavigate();
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      dur: 7 + Math.random() * 7,
      size: 2 + Math.random() * 3,
    })));
  }, []);

  // Separate open vs paused
  const open   = activeTournaments.filter(t => t.status === 'registration');
  const paused = activeTournaments.filter(t => t.status === 'paused');
  const hasAny = open.length > 0 || paused.length > 0;

  return (
    <div className={styles.wrap}>
      {/* Particles */}
      <div className={styles.particles} aria-hidden>
        {particles.map(p => (
          <span key={p.id} className={styles.particle} style={{
            left: `${p.left}%`, width: p.size, height: p.size,
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
          }} />
        ))}
      </div>

      {/* Grid overlay */}
      <div className={styles.grid} aria-hidden />

      <main className={styles.main}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoRing} />
          <div className={styles.logoCircle}>
            <img src="/logo.png" alt="DOCTORS" className={styles.logoImg}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
            <div className={styles.logoFallback}>DOCS</div>
          </div>
        </div>

        {/* Clan name */}
        <div className={styles.clanBlock}>
          <p className={styles.tagline}>— كلان —</p>
          <h1 className={styles.clanName}>DOCTORS</h1>
          <p className={styles.tagline}>— Free Fire —</p>
        </div>

        {/* Body */}
        {loading ? (
          <div className={styles.spinner}><div className={styles.ring} /></div>
        ) : (
          <div className={styles.body}>
            {/* Open tournaments */}
            {open.map(t => {
              const info = getDeadlineInfo(t.registrationStart);
              return (
                <div key={t.id} className={styles.tournamentCard}>
                  <div className={styles.cardTop}>
                    <span className={styles.liveDot} />
                    <span className={styles.liveText}>تسجيل مفتوح</span>
                  </div>

                  {/* Tournament name */}
                  {t.name && (
                    <div className={styles.tName}>{t.name}</div>
                  )}

                  <h2 className={styles.tType}>بطولة {TYPE_LABELS[t.type] || t.type}</h2>

                  {info && (
                    <p className={styles.dateInfo}>
                      التسجيل يُغلق يوم <strong>{info.deadlineDay}</strong> الساعة 12 بالليل
                      <br />
                      <span className={styles.startInfo}>🏆 البطولة تبدأ يوم {info.tourneyDay}</span>
                    </p>
                  )}

                  <div className={styles.teamsProgress}>
                    <span>{t.registeredCount || 0} / {t.maxTeams || 16} فريق</span>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill}
                        style={{ width: `${Math.min(((t.registeredCount||0)/(t.maxTeams||16))*100, 100)}%` }} />
                    </div>
                  </div>

                  <button className={styles.registerBtn}
                    onClick={() => navigate(`/register/${t.id}`)}>
                    <span className={styles.btnShine} />
                    سجّل الآن
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* Paused tournaments */}
            {paused.map(t => (
              <div key={t.id} className={`${styles.tournamentCard} ${styles.pausedCard}`}>
                <div className={styles.cardTop}>
                  <span className={styles.pausedDot} />
                  <span className={styles.pausedText}>التسجيل متوقف مؤقتاً</span>
                </div>
                {t.name && <div className={styles.tName}>{t.name}</div>}
                <h2 className={styles.tType}>بطولة {TYPE_LABELS[t.type] || t.type}</h2>
                <p className={styles.pausedMsg}>⏸ التسجيل موقوف حالياً — ترقّب الاستئناف قريباً</p>
              </div>
            ))}

            {/* No tournament */}
            {!hasAny && (
              <div className={styles.noTournament}>
                <div className={styles.swords}>⚔️</div>
                <h2 className={styles.noTitle}>لا توجد بطولات حالياً</h2>
                <p className={styles.noText}>
                  كلان DOCTORS في حالة استعداد للموسم القادم
                  <br /><span>ترقّب الإعلان عن البطولة القادمة قريباً</span>
                </p>
                <div className={styles.sep} />
                <p className={styles.hype}>🔥 كن مستعداً — المجد ينتظر الأقوى</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <span>DOCTORS CLAN © {new Date().getFullYear()}</span>
        <span className={styles.dot}>•</span>
        <span>Free Fire Tournament</span>
      </footer>
    </div>
  );
}
