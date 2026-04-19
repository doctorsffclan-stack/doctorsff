import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, getDocs,
  deleteDoc, onSnapshot, writeBatch
} from 'firebase/firestore';
import { generateSchedule } from '../utils/algorithm';
import styles from './AdminDashboard.module.css';

const TYPE_LABELS = { solo:'سولو', duo:'ثنائي', quad:'رباعي (4)' };
const TYPES = [
  { id:'duo',  label:'ثنائي', icon:'👥' },
  { id:'solo', label:'سولو',  icon:'🧍' },
  { id:'quad', label:'رباعي', icon:'👊' },
];
const TIME_LABELS = { asr:'5 العصر',night9:'9 بالليل',night10:'10 بالليل',night12:'12 بالليل',night1:'1 بالليل' };

export default function AdminDashboard() {
  const [tournaments, setTournaments]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [tab, setTab]                       = useState('overview');
  const [selId, setSelId]                   = useState(null);
  const [regs, setRegs]                     = useState([]);
  const [regsLoading, setRegsLoading]       = useState(false);
  const [schedule, setSchedule]             = useState(null);
  const [unscheduled, setUnscheduled]       = useState([]);
  const [toast, setToast]                   = useState('');
  const [confirmModal, setConfirmModal]     = useState(null);
  const [confirmForm, setConfirmForm]       = useState({ startDate:'', endDate:'' });

  // New tournament form
  const [newType, setNewType]     = useState('duo');
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db,'settings','tournaments'), snap => {
      setTournaments(snap.exists() ? (snap.data().list||[]) : []);
      setLoading(false);
    });
    return unsub;
  }, []);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const saveList = async list => {
    await setDoc(doc(db,'settings','tournaments'),{ list });
  };

  // ── CREATE tournament ─────────────────────────────────────
  const createTournament = async () => {
    setCreating(true);
    const id  = `t_${Date.now()}`;
    const now = new Date().toISOString();
    const t   = {
      id, type: newType, name: newName.trim() || '',
      status: 'registration', registrationStart: now,
      maxTeams: 16, registeredCount: 0, createdAt: now,
    };
    await saveList([...tournaments, t]);
    setNewName('');
    showToast('✅ تم بدء البطولة وفتح التسجيل');
    setCreating(false);
  };

  // ── PAUSE / RESUME ────────────────────────────────────────
  const togglePause = async (tId) => {
    const t = tournaments.find(x=>x.id===tId);
    if (!t) return;
    const next = t.status === 'registration' ? 'paused' : 'registration';
    const label = next === 'paused' ? '⏸ تم إيقاف التسجيل' : '▶️ تم استئناف التسجيل';

    // On resume: auto-extend if current maxTeams is full
    let maxTeams = t.maxTeams || 16;
    const count  = t.registeredCount || 0;
    if (next === 'registration' && count >= maxTeams) {
      const STEPS = [16,32,64,128];
      const nextStep = STEPS.find(s=>s>maxTeams) || maxTeams * 2;
      maxTeams = nextStep;
      showToast(`▶️ تم الاستئناف وتوسيع البطولة لـ ${maxTeams} فريق`);
    } else {
      showToast(label);
    }

    const updated = tournaments.map(x =>
      x.id===tId ? { ...x, status:next, maxTeams } : x
    );
    await saveList(updated);
  };

  // ── EXTEND max teams ──────────────────────────────────────
  const extendMax = async (tId, newMax) => {
    const updated = tournaments.map(x => x.id===tId ? {...x,maxTeams:newMax} : x);
    await saveList(updated);
    showToast(`✅ تم التوسيع لـ ${newMax} فريق`);
  };

  // ── CLOSE registration ────────────────────────────────────
  const closeReg = async (tId) => {
    const updated = tournaments.map(x => x.id===tId ? {...x,status:'closed'} : x);
    await saveList(updated);
    showToast('🔒 تم إغلاق التسجيل');
  };

  // ── FETCH registrations ───────────────────────────────────
  const fetchRegs = async (tId) => {
    setRegsLoading(true);
    const snap = await getDocs(collection(db,`tournaments/${tId}/registrations`));
    setRegs(snap.docs.map(d=>({id:d.id,...d.data()})));
    setSelId(tId);
    setTab('registrations');
    setSchedule(null);
    setRegsLoading(false);
  };

  // ── DELETE registration ───────────────────────────────────
  const deleteReg = async (regId) => {
    if (!window.confirm('مؤكد تمسح التسجيل ده؟')) return;
    await deleteDoc(doc(db,`tournaments/${selId}/registrations`,regId));
    const count = (regs.length - 1);
    setRegs(prev=>prev.filter(r=>r.id!==regId));
    // update count
    const updated = tournaments.map(x=>x.id===selId ? {...x,registeredCount:count} : x);
    await saveList(updated);
    showToast('🗑️ تم حذف التسجيل');
  };

  // ── RESET tournament ──────────────────────────────────────
  const resetTournament = async (tId) => {
    if (!window.confirm('هتمسح البطولة دي بالكامل؟')) return;
    const snap = await getDocs(collection(db,`tournaments/${tId}/registrations`));
    const batch = writeBatch(db);
    snap.docs.forEach(d=>batch.delete(d.ref));
    await batch.commit();
    const updated = tournaments.filter(x=>x.id!==tId);
    await saveList(updated);
    if (selId===tId) { setSelId(null);setRegs([]);setSchedule(null);setTab('overview'); }
    showToast('🗑️ تم مسح البطولة');
  };

  // ── CONFIRM & generate schedule ───────────────────────────
  const confirmTournament = async (tId) => {
    if (!confirmForm.startDate||!confirmForm.endDate) {
      showToast('⚠️ اختار التاريخين'); return;
    }
    const snap = await getDocs(collection(db,`tournaments/${tId}/registrations`));
    const entries = snap.docs.map(d=>d.data());
    if (entries.length < 2) { showToast('⚠️ محتاج فريقين على الأقل'); return; }

    const { scheduled, unscheduled: unsched } = generateSchedule(
      entries, confirmForm.startDate, confirmForm.endDate
    );
    setSchedule(scheduled);
    setUnscheduled(unsched);
    setSelId(tId);
    setTab('schedule');
    setConfirmModal(null);

    const updated = tournaments.map(x =>
      x.id===tId ? {...x,status:'active',startDate:confirmForm.startDate,endDate:confirmForm.endDate} : x
    );
    await saveList(updated);
    showToast('✅ تم توليد جدول البطولة');
  };

  const selTournament = tournaments.find(t=>t.id===selId);

  // ── RENDER ────────────────────────────────────────────────
  if (loading) return <div className={styles.centered}><div className={styles.ring}/></div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.hLeft}>
          <span className={styles.badge}>🛡️ الإدارة</span>
          <span className={styles.hTitle}>DOCTORS Admin</span>
        </div>
        <button className={styles.logout} onClick={()=>signOut(auth)}>خروج</button>
      </header>

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab}${tab==='overview'?' '+styles.tabOn:''}`} onClick={()=>setTab('overview')}>نظرة عامة</button>
        {selId && <>
          <button className={`${styles.tab}${tab==='registrations'?' '+styles.tabOn:''}`} onClick={()=>fetchRegs(selId)}>المسجّلون</button>
          {schedule && <button className={`${styles.tab}${tab==='schedule'?' '+styles.tabOn:''}`} onClick={()=>setTab('schedule')}>الجدول</button>}
        </>}
      </div>

      <div className={styles.content}>

        {/* ── OVERVIEW ─── */}
        {tab==='overview' && (
          <div className={styles.section}>
            {/* Create tournament card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>🏆 بدء بطولة جديدة</h2>

              {/* Tournament name input */}
              <div className={styles.nameGroup}>
                <label className={styles.label}>اسم البطولة (اختياري)</label>
                <input
                  className={styles.input}
                  placeholder='مثال: بطولة رمضان 2025'
                  value={newName}
                  onChange={e=>setNewName(e.target.value)}
                  maxLength={30}
                />
              </div>

              <div className={styles.typeRow}>
                {TYPES.map(t=>(
                  <button key={t.id}
                    className={`${styles.typeBtn}${newType===t.id?' '+styles.typeBtnOn:''}`}
                    onClick={()=>setNewType(t.id)}>
                    <span>{t.icon}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>
              <button className={styles.createBtn} onClick={createTournament} disabled={creating}>
                {creating ? <span className={styles.ring}/> : `🚀 بدء البطولة`}
              </button>
            </div>

            {/* Tournament list */}
            {tournaments.length===0
              ? <div className={styles.empty}><div>📋</div><p>مفيش بطولات دلوقتي</p></div>
              : tournaments.map(t=>(
                <TournamentCard key={t.id} t={t}
                  onView={()=>fetchRegs(t.id)}
                  onTogglePause={()=>togglePause(t.id)}
                  onClose={()=>closeReg(t.id)}
                  onConfirm={()=>{ setConfirmModal(t.id); setConfirmForm({startDate:'',endDate:''}); }}
                  onReset={()=>resetTournament(t.id)}
                  onExtend={extendMax}
                  selected={selId===t.id}
                />
              ))
            }
          </div>
        )}

        {/* ── REGISTRATIONS ─── */}
        {tab==='registrations' && selId && (
          <div className={styles.section}>
            <div className={styles.card}>
              <div className={styles.progRow}>
                <span>المسجّلون: <strong className={styles.gold}>{selTournament?.registeredCount||regs.length}</strong> / {selTournament?.maxTeams||16}</span>
                <span className={regs.length>=(selTournament?.maxTeams||16) ? styles.badgeFull : styles.badgeOpen}>
                  {regs.length>=(selTournament?.maxTeams||16) ? '✅ اكتمل' : '🔓 مفتوح'}
                </span>
              </div>
              <div className={styles.pBar}><div className={styles.pFill} style={{width:`${Math.min(((selTournament?.registeredCount||regs.length)/(selTournament?.maxTeams||16))*100,100)}%`}}/></div>
            </div>

            {regsLoading
              ? <div className={styles.centered}><div className={styles.ring}/></div>
              : regs.length===0
                ? <div className={styles.empty}><div>📭</div><p>مفيش تسجيلات لسه</p></div>
                : regs.map((r,i)=>(
                  <RegCard key={r.id} reg={r} index={i+1}
                    type={selTournament?.type||'duo'}
                    onDelete={()=>deleteReg(r.id)}
                  />
                ))
            }
          </div>
        )}

        {/* ── SCHEDULE ─── */}
        {tab==='schedule' && schedule && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📅 جدول المباريات</h2>
            {unscheduled.length>0 && (
              <div className={styles.warnCard}>
                <h3>⚠️ وقت مخصص — بدون ميعاد مشترك</h3>
                {unscheduled.map((u,i)=>(
                  <p key={i}>{u.team1} ضد {u.team2} — {u.reason}</p>
                ))}
              </div>
            )}
            {schedule.map((m,i)=>( <MatchCard key={i} m={m}/> ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div className={styles.overlay} onClick={()=>setConfirmModal(null)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <h2>تأكيد البطولة 🗓️</h2>
            <p>اختار تاريخ بدء وانتهاء البطولة</p>
            <div className={styles.dateFields}>
              <div><label>يوم البدء</label>
                <input type="date" className={styles.dateInput} value={confirmForm.startDate}
                  onChange={e=>setConfirmForm(p=>({...p,startDate:e.target.value}))}/>
              </div>
              <div><label>يوم الانتهاء</label>
                <input type="date" className={styles.dateInput} value={confirmForm.endDate}
                  onChange={e=>setConfirmForm(p=>({...p,endDate:e.target.value}))}/>
              </div>
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={()=>setConfirmModal(null)}>إلغاء</button>
              <button className={styles.confirmBtn} onClick={()=>confirmTournament(confirmModal)}>توليد الجدول ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function TournamentCard({ t, onView, onTogglePause, onClose, onConfirm, onReset, onExtend, selected }) {
  const statusMap = {
    registration: { label:'🟢 تسجيل مفتوح', color:'#10B981' },
    paused:       { label:'⏸ موقف مؤقتاً',   color:'#F59E0B' },
    closed:       { label:'🔴 مغلق',          color:'#EF4444' },
    active:       { label:'🏆 جارية',          color:'var(--gold)' },
  };
  const s = statusMap[t.status] || { label:t.status, color:'#888' };
  const date = new Date(t.registrationStart).toLocaleDateString('ar-EG');
  const isPausedOrOpen = t.status==='registration'||t.status==='paused';

  return (
    <div className={`${styles.tCard}${selected?' '+styles.tCardSel:''}`}>
      <div className={styles.tCardTop}>
        <div>
          {t.name && <div className={styles.tCardName}>{t.name}</div>}
          <div className={styles.tCardType}>بطولة {TYPE_LABELS[t.type]||t.type}</div>
          <div className={styles.tCardDate}>بدأت: {date} · {t.registeredCount||0}/{t.maxTeams||16} فريق</div>
        </div>
        <span style={{color:s.color,fontSize:'13px',fontWeight:'700',flexShrink:0}}>{s.label}</span>
      </div>
      <div className={styles.tCardBtns}>
        <Abtn label="👁️ المسجّلون" color="#3B82F6" onClick={onView}/>
        {isPausedOrOpen && (
          <Abtn
            label={t.status==='registration' ? '⏸ إيقاف' : '▶️ استئناف'}
            color={t.status==='registration' ? '#F59E0B' : '#10B981'}
            onClick={onTogglePause}
          />
        )}
        {t.status==='registration' && (
          <Abtn label="🔒 إغلاق نهائي" color="#EF4444" onClick={onClose}/>
        )}
        {(t.status==='registration'||t.status==='closed') && (
          <Abtn label="✅ تأكيد البطولة" color="#10B981" onClick={onConfirm}/>
        )}
        {/* Extend buttons — only while open/paused */}
        {isPausedOrOpen && [32,64,128].map(n=>(
          t.maxTeams < n && (
            <Abtn key={n} label={`📈 توسيع لـ ${n}`} color="var(--gold)" onClick={()=>onExtend(t.id,n)}/>
          )
        ))}
        <Abtn label="🗑️ مسح" color="#EF4444" onClick={onReset}/>
      </div>
    </div>
  );
}

function Abtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:`${color}20`,border:`1px solid ${color}50`,color,
      padding:'7px 13px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',
      fontFamily:'Tajawal,sans-serif',fontWeight:'600',transition:'background .2s',
    }}
    onMouseOver={e=>e.currentTarget.style.background=`${color}38`}
    onMouseOut={e=>e.currentTarget.style.background=`${color}20`}
    >{label}</button>
  );
}

function RegCard({ reg, index, type, onDelete }) {
  const [open,setOpen] = useState(false);
  const times = (reg.availableTimes||[]).map(t=>TIME_LABELS[t]||t).join('، ');
  return (
    <div className={styles.regCard}>
      <div className={styles.regTop} onClick={()=>setOpen(!open)}>
        <div className={styles.regLeft}>
          <span className={styles.regNum}>{index}</span>
          <div>
            <div className={styles.regTitle}>{type!=='solo'?(reg.teamName||'—'):reg.playerName}</div>
            <div className={styles.regSub}>{reg.playerName}</div>
          </div>
        </div>
        <div className={styles.regRight}>
          <span className={styles.chevron}>{open?'▲':'▼'}</span>
          <button className={styles.delBtn} onClick={e=>{e.stopPropagation();onDelete();}}>مسح</button>
        </div>
      </div>
      {open && (
        <div className={styles.regBody}>
          {type==='duo'&&<InfoRow label="شريك" value={reg.partnerName}/>}
          {type==='quad'&&<>
            <InfoRow label="لاعب 2" value={reg.player2Name}/>
            <InfoRow label="لاعب 3" value={reg.player3Name}/>
            <InfoRow label="لاعب 4" value={reg.player4Name}/>
          </>}
          <InfoRow label="ID اللاعب" value={reg.playerId}/>
          {type==='duo'&&<InfoRow label="ID الشريك" value={reg.partnerId}/>}
          <InfoRow label="واتساب" value={reg.whatsapp}/>
          <InfoRow label="المواعيد" value={times} gold/>
          <InfoRow label="التسجيل" value={new Date(reg.registeredAt).toLocaleString('ar-EG')}/>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, gold }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:'13px',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
      <span style={{color:'var(--text-secondary)'}}>{label}</span>
      <span style={{color:gold?'var(--gold)':'var(--text-primary)',fontWeight:'600',textAlign:'left',maxWidth:'60%',wordBreak:'break-all'}}>{value||'—'}</span>
    </div>
  );
}

function MatchCard({ m }) {
  if (m.isBye) return (
    <div className={styles.matchCard} style={{borderColor:'rgba(107,114,128,.3)'}}>
      <div className={styles.mHeader}>
        <span className={styles.mRound}>الدور {m.round}</span>
        <span className={styles.mDay}>{m.day}</span>
        <span style={{fontSize:'12px',color:'#6B7280'}}>BYE</span>
      </div>
      <div className={styles.mVsRow}>
        <span className={styles.mTeam}>{m.team1}</span>
        <span className={styles.mVs} style={{background:'rgba(107,114,128,.15)',color:'#6B7280'}}>BYE</span>
        <span className={styles.mTeam} style={{color:'var(--text-secondary)'}}>—</span>
      </div>
    </div>
  );
  return (
    <div className={styles.matchCard}>
      <div className={styles.mHeader}>
        <span className={styles.mRound}>الدور {m.round}</span>
        <span className={styles.mDay}>{m.day}</span>
        <span className={styles.mTime}>⏰ {m.time}</span>
      </div>
      <div className={styles.mVsRow}>
        <span className={styles.mTeam}>{m.team1}</span>
        <span className={styles.mVs}>VS</span>
        <span className={styles.mTeam}>{m.team2}</span>
      </div>
      <div className={styles.mPlayers}>
        <span>{m.player1}</span><span>{m.player2}</span>
      </div>
    </div>
  );
}
