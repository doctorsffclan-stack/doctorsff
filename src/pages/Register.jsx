import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import {
  collection, addDoc, getDocs, doc, getDoc, setDoc, onSnapshot
} from 'firebase/firestore';
import styles from './Register.module.css';

const TIME_SLOTS = [
  { id:'asr',     label:'5 العصر'   },
  { id:'night9',  label:'9 بالليل'  },
  { id:'night10', label:'10 بالليل' },
  { id:'night12', label:'12 بالليل' },
  { id:'night1',  label:'1 بالليل'  },
];

const TYPE_LABELS = { solo:'السولو', duo:'الثنائي', quad:'الرباعي' };

export default function Register() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [regCount, setRegCount]     = useState(0);
  const [form, setForm]             = useState({});
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch tournament data
  useEffect(() => {
    const unsub = onSnapshot(doc(db,'settings','tournaments'), async snap => {
      const list = snap.exists() ? (snap.data().list || []) : [];
      const t = list.find(x => x.id === tournamentId);
      if (!t || (t.status !== 'registration')) {
        navigate('/');
        return;
      }
      setTournament(t);

      // Count registrations
      const regs = await getDocs(collection(db,`tournaments/${tournamentId}/registrations`));
      const count = regs.size;
      setRegCount(count);

      // Auto-close if full
      if (count >= (t.maxTeams || 16) && t.status === 'registration') {
        const updated = list.map(x =>
          x.id === tournamentId ? { ...x, status:'closed', registeredCount: count } : x
        );
        await setDoc(doc(db,'settings','tournaments'),{ list: updated });
        navigate('/');
        return;
      }

      // Init form
      if (t.type === 'solo') setForm({ playerName:'', playerId:'', whatsapp:'', availableTimes:[] });
      else if (t.type === 'quad') setForm({ playerName:'',player2Name:'',player3Name:'',player4Name:'',
        teamName:'',playerId:'',player2Id:'',player3Id:'',player4Id:'',whatsapp:'',availableTimes:[] });
      else setForm({ playerName:'',partnerName:'',teamName:'',playerId:'',partnerId:'',whatsapp:'',availableTimes:[] });

      setPageLoading(false);
    });
    return unsub;
  }, [tournamentId]);

  // ─── Validation ───────────────────────────────────────────
  const validate = () => {
    const e = {};
    const type = tournament?.type || 'duo';

    const nameCheck = (val, field, label='اسم اللاعب') => {
      if (!val?.trim()) e[field]='مطلوب';
      else if (val.trim().length < 4) e[field]=`${label}: 4 حروف على الأقل`;
      else if (val.trim().length > 16) e[field]=`${label}: 16 حرف كحد أقصى`;
    };
    const idCheck = (val, field) => {
      if (!val?.trim()) e[field]='مطلوب';
      else if (!/^\d+$/.test(val)) e[field]='أرقام فقط';
      else if (val.length < 6 || val.length > 13) e[field]='من 6 لـ 13 رقم';
    };

    nameCheck(form.playerName, 'playerName', 'اسمك');

    if (type === 'duo') {
      nameCheck(form.partnerName,'partnerName','اسم الشريك');
      if (!form.teamName?.trim()) e.teamName='مطلوب';
      else if (form.teamName.trim().length > 15) e.teamName='15 حرف كحد أقصى';
      idCheck(form.partnerId,'partnerId');
    }
    if (type === 'quad') {
      nameCheck(form.player2Name,'player2Name','لاعب 2');
      nameCheck(form.player3Name,'player3Name','لاعب 3');
      nameCheck(form.player4Name,'player4Name','لاعب 4');
      if (!form.teamName?.trim()) e.teamName='مطلوب';
      else if (form.teamName.trim().length > 15) e.teamName='15 حرف كحد أقصى';
      idCheck(form.player2Id,'player2Id');
      idCheck(form.player3Id,'player3Id');
      idCheck(form.player4Id,'player4Id');
    }

    idCheck(form.playerId,'playerId');

    if (!form.whatsapp?.trim()) e.whatsapp='مطلوب';
    else if (!/^\d+$/.test(form.whatsapp)) e.whatsapp='أرقام فقط';
    else if (form.whatsapp.length < 10 || form.whatsapp.length > 15) e.whatsapp='رقم غير صالح';

    if (!form.availableTimes?.length) e.availableTimes='اختار ميعاد واحد على الأقل';

    return e;
  };

  const checkDuplicates = async () => {
    const snap = await getDocs(collection(db,`tournaments/${tournamentId}/registrations`));
    const existing = snap.docs.map(d => d.data());
    const type = tournament?.type || 'duo';

    for (const r of existing) {
      if (r.playerId === form.playerId) return 'هذا الـ ID مسجّل بالفعل';
      if (type !== 'solo') {
        if (r.teamName?.toLowerCase() === form.teamName?.toLowerCase()) return 'اسم الفريق ده مأخوذ بالفعل';
        if (type==='duo' && r.partnerId===form.partnerId) return 'ID الشريك مسجّل بالفعل';
        if (type==='quad') {
          const ids=[form.player2Id,form.player3Id,form.player4Id];
          const rIds=[r.player2Id,r.player3Id,r.player4Id,r.playerId];
          if (ids.some(id=>rIds.includes(id))) return 'أحد الـ IDs مسجّل بالفعل';
        }
      }
    }
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);

    try {
      const dup = await checkDuplicates();
      if (dup) { setErrors({ general: dup }); setSubmitting(false); return; }

      // Add registration
      await addDoc(collection(db,`tournaments/${tournamentId}/registrations`), {
        ...form, tournamentId, registeredAt: new Date().toISOString(),
      });

      // Update count + auto-close if full
      const newCount = regCount + 1;
      const settSnap = await getDoc(doc(db,'settings','tournaments'));
      const list = settSnap.data().list || [];
      const maxTeams = tournament.maxTeams || 16;
      const updated = list.map(t => t.id === tournamentId
        ? { ...t, registeredCount: newCount, status: newCount >= maxTeams ? 'closed' : t.status }
        : t
      );
      await setDoc(doc(db,'settings','tournaments'),{ list: updated });

      setSubmitted(true);
    } catch {
      setErrors({ general: 'حصل خطأ، حاول تاني' });
    }
    setSubmitting(false);
  };

  const set = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(p=>({...p,[f]:null,general:null})); };

  const toggleTime = id => {
    const times = form.availableTimes || [];
    set('availableTimes', times.includes(id) ? times.filter(t=>t!==id) : [...times,id]);
  };

  // ─── Render ───────────────────────────────────────────────
  if (pageLoading) return <div className={styles.centered}><div className={styles.ring}/></div>;

  if (submitted) return (
    <div className={styles.successPage}>
      <div className={styles.successCard}>
        <div className={styles.check}>✓</div>
        <h2>تم التسجيل بنجاح! 🎉</h2>
        <p>تم تسجيل فريقك في البطولة</p>
        <p className={styles.wait}>انتظر التواصل معك على الواتساب قريباً</p>
        <div className={styles.gline}/>
        <p className={styles.luck}>بالتوفيق يا بطل 🔥</p>
        <button className={styles.backBtn} onClick={()=>navigate('/')}>العودة للرئيسية</button>
      </div>
    </div>
  );

  const type = tournament?.type || 'duo';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={()=>navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          رجوع
        </button>
        <span className={styles.topTitle}>بطولة {TYPE_LABELS[type]}</span>
      </div>

      <div className={styles.formWrap}>
        <div className={styles.fHeader}>
          <h1>استمارة التسجيل</h1>
          <p>كل الحقول مطلوبة</p>
        </div>

        {errors.general && <div className={styles.genErr}>⚠️ {errors.general}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Field label="اسمك في اللعبة" hint="4-16 حرف"
            value={form.playerName||''} onChange={v=>set('playerName',v)} error={errors.playerName}/>

          {type==='duo' && <>
            <Field label="اسم شريكك في اللعبة" hint="4-16 حرف"
              value={form.partnerName||''} onChange={v=>set('partnerName',v)} error={errors.partnerName}/>
            <Field label="اسم الفريق" hint="حد أقصى 15 حرف"
              value={form.teamName||''} onChange={v=>set('teamName',v)} error={errors.teamName}/>
          </>}

          {type==='quad' && <>
            <Field label="اسم اللاعب الثاني" hint="4-16 حرف" value={form.player2Name||''} onChange={v=>set('player2Name',v)} error={errors.player2Name}/>
            <Field label="اسم اللاعب الثالث" hint="4-16 حرف" value={form.player3Name||''} onChange={v=>set('player3Name',v)} error={errors.player3Name}/>
            <Field label="اسم اللاعب الرابع" hint="4-16 حرف" value={form.player4Name||''} onChange={v=>set('player4Name',v)} error={errors.player4Name}/>
            <Field label="اسم الفريق" hint="حد أقصى 15 حرف" value={form.teamName||''} onChange={v=>set('teamName',v)} error={errors.teamName}/>
          </>}

          <Field label="الـ ID بتاعك" hint="6-13 رقم" inputMode="numeric"
            value={form.playerId||''} onChange={v=>set('playerId',v.replace(/\D/g,''))} error={errors.playerId}/>

          {type==='duo' && <Field label="الـ ID بتاع شريكك" hint="6-13 رقم" inputMode="numeric"
            value={form.partnerId||''} onChange={v=>set('partnerId',v.replace(/\D/g,''))} error={errors.partnerId}/>}

          {type==='quad' && <>
            <Field label="ID اللاعب الثاني" hint="6-13 رقم" inputMode="numeric" value={form.player2Id||''} onChange={v=>set('player2Id',v.replace(/\D/g,''))} error={errors.player2Id}/>
            <Field label="ID اللاعب الثالث" hint="6-13 رقم" inputMode="numeric" value={form.player3Id||''} onChange={v=>set('player3Id',v.replace(/\D/g,''))} error={errors.player3Id}/>
            <Field label="ID اللاعب الرابع" hint="6-13 رقم" inputMode="numeric" value={form.player4Id||''} onChange={v=>set('player4Id',v.replace(/\D/g,''))} error={errors.player4Id}/>
          </>}

          <Field label="رقم الواتساب" hint="أرقام فقط" inputMode="tel"
            value={form.whatsapp||''} onChange={v=>set('whatsapp',v.replace(/\D/g,''))} error={errors.whatsapp}/>

          {/* Time slots */}
          <div className={styles.group}>
            <label className={styles.label}>
              المواعيد المناسبة
              <span className={styles.hint}>اختار أكتر من ميعاد</span>
            </label>
            <div className={styles.timeGrid}>
              {TIME_SLOTS.map(s=>(
                <button key={s.id} type="button"
                  className={`${styles.timeBtn} ${form.availableTimes?.includes(s.id)?styles.timeOn:''}`}
                  onClick={()=>toggleTime(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            {errors.availableTimes && <span className={styles.err}>{errors.availableTimes}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? <span className={styles.ring}/> : 'تأكيد التسجيل 🎮'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, error, inputMode='text' }) {
  return (
    <div className={styles.group}>
      <label className={styles.label}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </label>
      <input
        className={`${styles.input}${error?' '+styles.inputErr:''}`}
        value={value} onChange={e=>onChange(e.target.value)}
        inputMode={inputMode} autoComplete="off"
      />
      {error && <span className={styles.err}>{error}</span>}
    </div>
  );
}
