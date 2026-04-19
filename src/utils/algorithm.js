// ====================================================
// Tournament Scheduling Algorithm — DOCTORS Clan
// Supports: solo, duo, quad
// ====================================================

export const TIME_SLOTS = [
  { id: 'asr',     label: '5 العصر',   hour: 17 },
  { id: 'night9',  label: '9 بالليل',  hour: 21 },
  { id: 'night10', label: '10 بالليل', hour: 22 },
  { id: 'night12', label: '12 بالليل', hour: 0  },
  { id: 'night1',  label: '1 بالليل',  hour: 1  },
];

export const getTimeLabel = (id) =>
  TIME_SLOTS.find(t => t.id === id)?.label || id;

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Get array of date strings between start and end
function getDays(startDate, endDate) {
  const days = [];
  const names = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    days.push(`${names[cur.getDay()]} ${cur.getDate()}/${cur.getMonth()+1}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Build single-elimination bracket pairs
function makePairs(teams) {
  const pairs = [];
  for (let i = 0; i < teams.length; i += 2) {
    pairs.push({ a: teams[i], b: teams[i+1] || null });
  }
  return pairs;
}

// Find common available times between two entries
function commonTimes(a, b) {
  if (!b) return a.availableTimes || [];
  return (a.availableTimes || []).filter(t =>
    (b.availableTimes || []).includes(t)
  );
}

// Main export
export function generateSchedule(entries, startDate, endDate) {
  const days   = getDays(startDate, endDate);
  const teams  = shuffle(entries);
  const pairs  = makePairs(teams);

  const scheduled   = [];
  const unscheduled = [];

  // Distribute matches across available days evenly
  const matchesPerDay = Math.max(1, Math.ceil(pairs.length / Math.max(days.length, 1)));

  pairs.forEach((pair, idx) => {
    const { a, b } = pair;
    if (!b) {
      // Bye — team advances automatically
      scheduled.push({
        isBye: true,
        team1: getEntryName(a),
        team2: null,
        player1: a.playerName,
        player2: null,
        day: days[Math.min(Math.floor(idx / matchesPerDay), days.length - 1)] || 'يوم 1',
        time: '—',
        round: 1,
      });
      return;
    }

    const common = commonTimes(a, b);
    const dayIdx = Math.min(Math.floor(idx / matchesPerDay), days.length - 1);
    const day    = days[dayIdx] || `يوم ${dayIdx + 1}`;

    if (common.length === 0) {
      unscheduled.push({
        team1: getEntryName(a),
        team2: getEntryName(b),
        player1: a.playerName,
        player2: b.playerName,
        reason: 'وقت مخصص — لا يوجد ميعاد مشترك',
        day,
        round: 1,
      });
    } else {
      const chosenTime = common[Math.floor(Math.random() * common.length)];
      scheduled.push({
        isBye: false,
        team1: getEntryName(a),
        team2: getEntryName(b),
        player1: a.playerName,
        player2: b.playerName,
        time: getTimeLabel(chosenTime),
        timeId: chosenTime,
        day,
        round: 1,
      });
    }
  });

  return { scheduled, unscheduled };
}

function getEntryName(e) {
  return e.teamName || e.playerName || 'لاعب';
}
