import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── storage ──────────────────────────────────────────────────────
// New keys for the Jason Build. Old Rugby/Tennis data (tengby:sessions etc.)
// is left untouched in the browser, just no longer shown.
const K = {
  sessions: "tengby:jb:sessions",
  weighins: "tengby:jb:weighins",   // { "YYYY-MM-DD": lb }
  waist:    "tengby:jb:waist",      // { "YYYY-MM-DD": in }
  food:     "tengby:jb:food",       // { "YYYY-MM-DD": { training, checks:{} } }
  start:    "tengby:jb:start",
  deload:   "tengby:jb:last-deload",
  travel:   "tengby:jb:travel",
};

const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const usePersist = (k, fb) => {
  const [v, setV] = useState(() => load(k, typeof fb === "function" ? fb() : fb));
  useEffect(() => { save(k, v); }, [k, v]);
  return [v, setV];
};

// ── helpers ──────────────────────────────────────────────────────
const localKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayKey = () => localKey(new Date());
const keyToDate = k => new Date(k + "T00:00:00");
const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 86400000);
const addDays = (k, n) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return localKey(d); };
const prettyDate = k => keyToDate(k).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const shortDate = k => keyToDate(k).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const pad2 = n => String(n).padStart(2, "0");
const fmtClock = s => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
const uid = () => Math.random().toString(36).slice(2, 10);
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
const repRange = reps => { const m = String(reps).match(/(\d+)(?:\s*[–-]\s*(\d+))?/); if (!m) return [null, null]; const lo = +m[1]; return [lo, m[2] ? +m[2] : lo]; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r1 = n => Math.round(n * 10) / 10;
const buzz = () => { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {} };

// ── PROGRAM ──────────────────────────────────────────────────────
// inc = lb to add once every set hits the top of the rep range
const SESSIONS = {
  ua: { id: "ua", short: "Upper A", label: "Upper A — Strength", exercises: [
    { name: "Barbell Bench Press", sets: 4, reps: "5–8", rest: 150, inc: 5 },
    { name: "Weighted Pull-up / Lat Pulldown", sets: 4, reps: "6–10", rest: 120, inc: 5 },
    { name: "Seated DB Shoulder Press", sets: 3, reps: "8–10", rest: 90, inc: 5 },
    { name: "Chest-Supported Row", sets: 3, reps: "8–12", rest: 90, inc: 5 },
    { name: "DB Lateral Raise", sets: 3, reps: "12–20", rest: 60, inc: 5 },
    { name: "EZ-Bar Curl", sets: 3, reps: "8–12", rest: 60, inc: 5 },
    { name: "Overhead Cable Triceps Ext.", sets: 3, reps: "10–15", rest: 60, inc: 5 },
  ]},
  la: { id: "la", short: "Lower A", label: "Lower A — Squat", exercises: [
    { name: "Back Squat", sets: 4, reps: "5–8", rest: 150, inc: 10 },
    { name: "Romanian Deadlift", sets: 3, reps: "6–10", rest: 120, inc: 10 },
    { name: "Walking Lunge", sets: 3, reps: "10/leg", rest: 90, inc: 10 },
    { name: "Lying Leg Curl", sets: 3, reps: "10–15", rest: 60, inc: 10 },
    { name: "Standing Calf Raise", sets: 3, reps: "10–15", rest: 60, inc: 10 },
    { name: "Hanging Knee Raise", sets: 3, reps: "10–15", rest: 60, inc: 0 },
  ]},
  ub: { id: "ub", short: "Upper B", label: "Upper B — Volume", exercises: [
    { name: "Incline DB Press", sets: 4, reps: "8–12", rest: 120, inc: 5 },
    { name: "Neutral-Grip Lat Pulldown", sets: 3, reps: "10–12", rest: 90, inc: 5 },
    { name: "Weighted Dip", sets: 3, reps: "8–12", rest: 90, inc: 5 },
    { name: "Seated Cable Row", sets: 3, reps: "10–12", rest: 90, inc: 5 },
    { name: "Cable Lateral Raise", sets: 4, reps: "12–20", rest: 60, inc: 5 },
    { name: "Rear-Delt Fly", sets: 3, reps: "15–20", rest: 60, inc: 5 },
    { name: "Hammer Curl", sets: 3, reps: "10–15", rest: 0, inc: 5, note: "Superset with pushdown" },
    { name: "Triceps Pushdown", sets: 3, reps: "10–15", rest: 60, inc: 5 },
  ]},
  lb: { id: "lb", short: "Lower B", label: "Lower B — Hinge", exercises: [
    { name: "Trap-Bar Deadlift", sets: 4, reps: "4–6", rest: 150, inc: 10 },
    { name: "Leg Press", sets: 3, reps: "10–15", rest: 120, inc: 10 },
    { name: "Bulgarian Split Squat", sets: 3, reps: "8–12/leg", rest: 90, inc: 10 },
    { name: "Leg Extension", sets: 3, reps: "12–15", rest: 60, inc: 10 },
    { name: "Seated Calf Raise", sets: 3, reps: "12–20", rest: 60, inc: 10 },
    { name: "Cable Crunch / Ab Wheel", sets: 3, reps: "10–15", rest: 60, inc: 5 },
  ]},
  travel: { id: "travel", short: "Hotel Gym", label: "Hotel Gym — Full Body", travel: true, exercises: [
    { name: "Goblet Squat / Bulgarian Split Squat", sets: 3, reps: "10–15", rest: 75, inc: 5 },
    { name: "DB Bench / Feet-Elevated Push-up", sets: 3, reps: "10–20", rest: 75, inc: 5 },
    { name: "One-Arm DB Row", sets: 3, reps: "10–12/arm", rest: 60, inc: 5 },
    { name: "DB Romanian Deadlift", sets: 3, reps: "10–12", rest: 75, inc: 5 },
    { name: "DB Shoulder Press", sets: 3, reps: "10–12", rest: 60, inc: 5 },
    { name: "Lateral Raise", sets: 3, reps: "15", rest: 0, inc: 5, note: "Superset with curl" },
    { name: "DB Curl", sets: 3, reps: "15", rest: 60, inc: 5 },
  ]},
};
const ROTATION = ["ua", "la", "ub", "lb"];
const isLower = id => id === "la" || id === "lb";

// last logged instance of an exercise (sessions are newest-first)
function lastFor(sessions, name) {
  for (const s of sessions) {
    if (s.deload) continue;
    const ex = s.exercises.find(e => e.name === name);
    if (ex && ex.sets.some(st => num(st.weight) !== null || num(st.reps) !== null)) return { date: s.date, ex };
  }
  return null;
}

function suggestion(sessions, ex) {
  const last = lastFor(sessions, ex.name);
  const [, top] = repRange(ex.reps);
  if (!last) return { text: "First time: pick a weight you could do for 2 more reps.", weight: "" };
  const sets = last.ex.sets.filter(st => num(st.reps) !== null);
  const weights = sets.map(st => num(st.weight)).filter(w => w !== null);
  const topW = weights.length ? Math.max(...weights) : null;
  const unit = last.ex.sets[0]?.unit || "lb";
  const best = sets.reduce((b, st) => (num(st.weight) ?? 0) >= (num(b?.weight) ?? -1) ? st : b, null);
  const lastTxt = best ? `${best.weight || "BW"}${best.weight ? " " + unit : ""} × ${best.reps}` : "—";
  const allTop = top && sets.length >= ex.sets && sets.every(st => num(st.reps) >= top);
  if (allTop && ex.inc && topW !== null) {
    const inc = unit === "kg" ? (ex.inc >= 10 ? 5 : 2.5) : ex.inc;
    return { text: `Last ${shortDate(last.date)}: ${lastTxt}. Hit the top of the range — go ${r1(topW + inc)} ${unit}.`, weight: String(r1(topW + inc)), up: true, unit };
  }
  if (allTop) return { text: `Last ${shortDate(last.date)}: ${lastTxt}. Top of range — make it harder.`, weight: topW !== null ? String(topW) : "", up: true, unit };
  return { text: `Last ${shortDate(last.date)}: ${lastTxt}. Same weight, beat the reps.`, weight: topW !== null ? String(topW) : "", unit };
}

// ── main app ─────────────────────────────────────────────────────
export default function Tengby() {
  const [tab, setTab]             = useState("today");
  const [sessions, setSessions]   = usePersist(K.sessions, []);
  const [weighins, setWeighins]   = usePersist(K.weighins, {});
  const [waist, setWaist]         = usePersist(K.waist, {});
  const [food, setFood]           = usePersist(K.food, {});
  const [start]                   = usePersist(K.start, todayKey);
  const [lastDeload, setLastDeload] = usePersist(K.deload, null);
  const [travel, setTravel]       = usePersist(K.travel, false);
  const [logModal, setLogModal]   = useState(null); // { sessionId, deload }
  const [pendingPreset, setPendingPreset] = useState(null);

  const lastMain = sessions.find(s => ROTATION.includes(s.dayId));
  const nextId = travel ? "travel" : lastMain ? ROTATION[(ROTATION.indexOf(lastMain.dayId) + 1) % 4] : "ua";
  const deloadFrom = lastDeload || start;
  const daysSinceDeload = daysBetween(deloadFrom, todayKey());

  const saveSession = data => { setSessions(prev => [data, ...prev]); if (data.deload) setLastDeload(todayKey()); setLogModal(null); setTab("log"); };
  const deleteSession = id => setSessions(prev => prev.filter(s => s.id !== id));
  const openLog = (sessionId, deload = false) => setLogModal({ sessionId, deload });

  const tabs = [["today","Today"],["plan","Plan"],["log","Log"],["progress","Progress"],["food","Food"],["timer","Timer"]];

  return (
    <div style={s.app}>
      <style>{css}</style>
      <header style={s.header}>
        <div style={s.headerInner}>
          <h1 style={s.wordmark}>TENGBY</h1>
          <span style={s.dateChip}>{prettyDate(todayKey())}</span>
        </div>
        <div style={s.sportSwitch}>
          {[[false,"Home gym"],[true,"Travel mode"]].map(([v,label]) => (
            <button key={label} onClick={() => setTravel(v)} style={{...s.sportBtn, ...(travel===v ? s.sportBtnActive : {})}}>{label}</button>
          ))}
        </div>
        <nav style={s.tabs}>
          {tabs.map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{...s.tabBtn, ...(tab===id ? s.tabBtnActive : {})}}>{label}</button>
          ))}
        </nav>
      </header>

      <main style={s.main}>
        {tab === "today"    && <TodayTab nextId={nextId} sessions={sessions} travel={travel} daysSinceDeload={daysSinceDeload} start={start} weighins={weighins} food={food} openLog={openLog} goTab={setTab} />}
        {tab === "plan"     && <PlanTab openLog={openLog} />}
        {tab === "log"      && <LogTab sessions={sessions} deleteSession={deleteSession} />}
        {tab === "progress" && <ProgressTab weighins={weighins} setWeighins={setWeighins} waist={waist} setWaist={setWaist} sessions={sessions} start={start} />}
        {tab === "food"     && <FoodTab food={food} setFood={setFood} sessions={sessions} />}
        {tab === "timer"    && <TimerTab pendingPreset={pendingPreset} onConsumePreset={() => setPendingPreset(null)} />}
      </main>

      {logModal && (
        <LogModal session={SESSIONS[logModal.sessionId]} deload={logModal.deload} history={sessions}
          onSave={saveSession} onClose={() => setLogModal(null)} />
      )}
    </div>
  );
}

// ── TODAY TAB ────────────────────────────────────────────────────
function TodayTab({ nextId, sessions, travel, daysSinceDeload, start, weighins, food, openLog, goTab }) {
  const sess = SESSIONS[nextId];
  const today = todayKey();
  const doneToday = sessions.filter(x => x.date === today);
  const weekAgo = addDays(today, -6);
  const thisWeek = sessions.filter(x => x.date >= weekAgo && !x.deload).length;
  const weekNo = Math.floor(daysBetween(start, today) / 7) + 1;
  const deloadDue = !travel && daysSinceDeload >= 42;
  const foodToday = food[today];
  const foodDone = foodToday ? Object.values(foodToday.checks || {}).filter(Boolean).length : 0;

  return (
    <div>
      <div style={s.statRow}>
        <Stat label="Week" value={weekNo} />
        <Stat label="Sessions / 7d" value={`${thisWeek}/${travel ? 3 : 4}`} />
        <Stat label="Weighed today" value={weighins[today] ? `${weighins[today]}` : "—"} onClick={() => goTab("progress")} />
        <Stat label="Food checks" value={foodDone} onClick={() => goTab("food")} />
      </div>

      {deloadDue && (
        <section style={{...s.card, borderColor: colors.coral}}>
          <h2 style={{...s.cardTitle, color: colors.coral, marginBottom: 6}}>Deload due</h2>
          <p style={s.bodyText}>It's been {Math.floor(daysSinceDeload / 7)} weeks. Run this week light: same exercises, half the sets, about 70% of your weights. Tap "Log as deload" on each session — the clock resets after the first.</p>
        </section>
      )}

      {doneToday.length > 0 && (
        <div style={s.doneNote}>✓ Logged today: {doneToday.map(x => x.dayLabel).join(", ")}</div>
      )}

      <section style={s.card}>
        <div style={s.miniLabel}>{travel ? "Travel session" : "Next in rotation"}</div>
        <h2 style={{...s.cardTitle, fontSize: 28, margin: "2px 0 12px", color: colors.amber}}>{sess.label}</h2>
        <ul style={s.exList}>
          {sess.exercises.map((ex, i) => {
            const sug = suggestion(sessions, ex);
            return (
              <li key={i} style={{...s.exItem, flexDirection: "column", gap: 3, padding: "9px 0"}}>
                <div style={{display: "flex", justifyContent: "space-between", gap: 10}}>
                  <span>{ex.name}</span>
                  <span style={s.exSetsReps}>{ex.sets} × {ex.reps}</span>
                </div>
                <span style={{...s.hint, color: sug.up ? colors.amber : colors.sage}}>{sug.up ? "▲ " : ""}{sug.text}</span>
              </li>
            );
          })}
        </ul>
        <div style={s.dayActions}>
          <button style={s.dayActionBtn} onClick={() => openLog(nextId)}>Start session</button>
          {deloadDue && <button style={s.dayActionBtnAlt} onClick={() => openLog(nextId, true)}>Log as deload</button>}
        </div>
        {!travel && (
          <div style={s.pickRow}>
            <span style={s.miniLabel}>Or pick:</span>
            {ROTATION.filter(id => id !== nextId).map(id => (
              <button key={id} style={s.chipBtn} onClick={() => openLog(id)}>{SESSIONS[id].short}</button>
            ))}
          </div>
        )}
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Every day</h2>
        <ul style={s.tipList}>
          <li style={s.tipItem}>8,000–10,000 steps</li>
          <li style={s.tipItem}>Weigh in first thing, log it in Progress</li>
          <li style={s.tipItem}>Protein at every meal — tick it off in Food</li>
          {travel && <li style={s.tipItem}>Travel: eat at maintenance, 1 cupped hand of carbs per meal, hold protein</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, onClick }) {
  return (
    <button style={s.stat} onClick={onClick} disabled={!onClick}>
      <span style={s.statValue}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </button>
  );
}

// ── LOG MODAL ────────────────────────────────────────────────────
function LogModal({ session, deload, history, onSave, onClose }) {
  const [exData, setExData] = useState(() => session.exercises.map(ex => {
    const sug = suggestion(history, ex);
    const n = deload ? Math.max(1, Math.ceil(ex.sets / 2)) : ex.sets;
    const w = deload && num(sug.weight) ? String(Math.round(num(sug.weight) * 0.7 / 5) * 5) : sug.weight;
    return { ...ex, hint: sug.text, loggedSets: Array.from({ length: n }, () => ({ reps: "", weight: w, unit: sug.unit || "lb", done: false })) };
  }));
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState("");
  const [rest, setRest] = useState(null); // { end, total, name }
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest]);
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0;
  const buzzed = useRef(false);
  useEffect(() => { if (rest && restLeft === 0 && !buzzed.current) { buzzed.current = true; buzz(); } }, [rest, restLeft]);

  const updateSet = (ei, si, field, val) => setExData(prev => prev.map((ex, i) => i !== ei ? ex : {
    ...ex, loggedSets: ex.loggedSets.map((st, j) => j !== si ? st : { ...st, [field]: val })
  }));

  const toggleSetDone = (ei, si) => {
    const ex = exData[ei], st = ex.loggedSets[si];
    if (!st.done) {
      if (ex.rest) { buzzed.current = false; setRest({ end: Date.now() + ex.rest * 1000, total: ex.rest, name: ex.name }); setNow(Date.now()); }
    }
    setExData(prev => prev.map((e, i) => i !== ei ? e : { ...e, loggedSets: e.loggedSets.map((x, j) => j !== si ? x : { ...x, done: !x.done, reps: x.reps || (!x.done ? String(repRange(e.reps)[1] || "") : x.reps) }) }));
  };

  const addSet = ei => setExData(prev => prev.map((ex, i) => i !== ei ? ex : {
    ...ex, loggedSets: [...ex.loggedSets, { reps: "", weight: ex.loggedSets[ex.loggedSets.length - 1]?.weight || "", unit: ex.loggedSets[ex.loggedSets.length - 1]?.unit || "lb", done: false }]
  }));
  const removeSet = (ei, si) => setExData(prev => prev.map((ex, i) => i !== ei ? ex : ({ ...ex, loggedSets: ex.loggedSets.filter((_, j) => j !== si) })));

  const handleSave = () => onSave({
    id: uid(), date: todayKey(), ts: Date.now(), dayId: session.id,
    dayLabel: session.label + (deload ? " (deload)" : ""), deload,
    exercises: exData.map(ex => ({ name: ex.name, planned: `${ex.sets} × ${ex.reps}`, sets: ex.loggedSets })),
    notes, rpe,
  });

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>{session.label}</div>
            <div style={s.modalSub}>{deload ? "Deload — half sets, ~70% weight" : "Tick a set to start its rest timer"}</div>
          </div>
          <button onClick={onClose} style={s.closeBtn} aria-label="Close">✕</button>
        </div>

        {rest && (
          <div style={{...s.restBar, background: restLeft === 0 ? colors.sage : colors.amber}}>
            <span>{restLeft === 0 ? "Rest done — go" : `Rest · ${rest.name}`}</span>
            <span style={s.restClock}>{fmtClock(restLeft)}</span>
            <button style={s.restSkip} onClick={() => setRest(null)}>{restLeft === 0 ? "OK" : "Skip"}</button>
          </div>
        )}

        <div style={s.modalBody}>
          {exData.map((ex, ei) => (
            <div key={ei} style={s.exBlock}>
              <div style={s.exBlockHeader}>
                <span style={s.exBlockName}>{ex.name}</span>
                <span style={s.exBlockPlanned}>{ex.sets} × {ex.reps}{ex.rest ? ` · ${ex.rest}s` : ""}</span>
              </div>
              <div style={s.hint}>{ex.note ? ex.note + ". " : ""}{ex.hint}</div>
              <div style={s.setGrid}>
                <div style={s.setGridHeader}><span>Set</span><span>Reps</span><span>Weight</span><span></span><span>✓</span><span></span></div>
                {ex.loggedSets.map((st, si) => (
                  <div key={si} style={{...s.setRow, ...(st.done ? s.setRowDone : {})}}>
                    <span style={s.setNum}>{si + 1}</span>
                    <input style={s.setInput} placeholder={ex.reps} value={st.reps} inputMode="numeric" onChange={e => updateSet(ei, si, "reps", e.target.value)} />
                    <input style={s.setInput} placeholder="0" value={st.weight} inputMode="decimal" onChange={e => updateSet(ei, si, "weight", e.target.value)} />
                    <select style={s.unitSel} value={st.unit} onChange={e => updateSet(ei, si, "unit", e.target.value)}><option>lb</option><option>kg</option></select>
                    <button style={{...s.doneBtn, ...(st.done ? s.doneBtnActive : {})}} onClick={() => toggleSetDone(ei, si)} aria-label="Set done">{st.done ? "✓" : "○"}</button>
                    <button style={s.removeSetBtn} onClick={() => removeSet(ei, si)} aria-label="Remove set">✕</button>
                  </div>
                ))}
              </div>
              <button style={s.addSetBtn} onClick={() => addSet(ei)}>+ Add set</button>
            </div>
          ))}
          <div style={s.sessionMeta}>
            <div style={s.metaField}>
              <label style={s.metaLabel}>RPE (1–10)</label>
              <input style={{...s.setInput, width: 80}} placeholder="7" value={rpe} inputMode="numeric" onChange={e => setRpe(e.target.value)} />
            </div>
            <div style={s.metaField}>
              <label style={s.metaLabel}>Session notes</label>
              <textarea style={s.notesInput} placeholder="PRs, how it felt, anything to change..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </div>
        <div style={s.modalFooter}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave}>Save session ✓</button>
        </div>
      </div>
    </div>
  );
}

// ── PLAN TAB ─────────────────────────────────────────────────────
function PlanTab({ openLog }) {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div style={s.programIntro}>Goal: about 10–12% body fat on a thick, athletic frame. Cut at 1–2 lb a week for months 1–6, slow to 0.5–1 lb a week until abs show, then lean gain.</div>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Weekly split</h2>
        <table style={s.table}><tbody>
          {[["Mon","Upper A"],["Tue","Lower A"],["Wed","Rest or zone 2"],["Thu","Upper B"],["Fri","Lower B"],["Sat","Cardio or sport"],["Sun","Rest"]].map(([d,w]) => (
            <tr key={d}><td style={s.tdDay}>{d}</td><td style={s.td}>{w}</td></tr>
          ))}
        </tbody></table>
        <p style={{...s.bodyText, marginTop: 12, marginBottom: 0}}>3-day week: keep rotating through the four sessions in order. Today always shows the next one.</p>
      </section>

      {Object.values(SESSIONS).map(sess => {
        const isOpen = open === sess.id;
        return (
          <div key={sess.id} style={s.cycleBlock}>
            <button style={s.cycleHeader} onClick={() => setOpen(isOpen ? null : sess.id)}>
              <div>
                <div style={s.cycleName}>{sess.label}</div>
                <div style={s.cycleSpan}>{sess.exercises.length} exercises{sess.travel ? " · 3× a week on trips" : ""}</div>
              </div>
              <span style={{color: colors.paperDim}}>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <div style={s.phaseBody}>
                <ul style={s.exList}>
                  {sess.exercises.map((ex, i) => (
                    <li key={i} style={s.exItem}><span>{ex.name}</span><span style={s.exSetsReps}>{ex.sets} × {ex.reps}</span></li>
                  ))}
                </ul>
                <div style={s.dayActions}><button style={s.dayActionBtn} onClick={() => openLog(sess.id)}>Log this session</button></div>
              </div>
            )}
          </div>
        );
      })}

      <section style={s.card}>
        <h2 style={s.cardTitle}>Progression</h2>
        <ul style={s.tipList}>
          <li style={s.tipItem}>Double progression: hit the top of the rep range on every set, then add 5 lb (upper) or 10 lb (lower). The app flags it.</li>
          <li style={s.tipItem}>Finish most sets with 1–2 reps in the tank; push isolation work closer to failure.</li>
          <li style={s.tipItem}>On a cut, holding strength is a win. Falling strength = more protein or a smaller deficit.</li>
          <li style={s.tipItem}>Deload every 6–8 weeks: half the sets, lighter weight. A trip can be the deload.</li>
        </ul>
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Cardio</h2>
        <ul style={s.tipList}>
          <li style={s.tipItem}>Steps: 8,000–10,000 every day</li>
          <li style={s.tipItem}>Zone 2: 2 × 25–35 min a week (incline walk, bike, rower), conversational pace</li>
          <li style={s.tipItem}>Optional: 1 hard session a week — 6–10 × 20 s sled or bike sprints (Timer tab). Keep it away from leg days.</li>
        </ul>
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>On the road</h2>
        <ul style={s.tipList}>
          <li style={s.tipItem}>Switch to Travel mode up top. Hotel Gym session 3× a week.</li>
          <li style={s.tipItem}>Eat at maintenance: hold protein, 1 cupped hand of carbs per meal, count dessert or drinks as that meal's carbs.</li>
          <li style={s.tipItem}>Pack protein powder or bars. Flight days: walk the terminal and let steps be the workout.</li>
          <li style={s.tipItem}>First week back: about 80% of your previous weights.</li>
        </ul>
      </section>
      <p style={s.disclaimer}>General guidance, not medical advice. Check with your doctor first if you have a medical condition or take medication.</p>
    </div>
  );
}

// ── LOG TAB ──────────────────────────────────────────────────────
function LogTab({ sessions, deleteSession }) {
  const [expanded, setExpanded] = useState({});
  const [confirm, setConfirm] = useState(null);
  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));
  if (sessions.length === 0) return <div style={s.empty}>No sessions yet. Start one from the Today tab.</div>;
  const dates = [...new Set(sessions.map(x => x.date))].sort((a, b) => a < b ? 1 : -1);

  return (
    <div>
      {dates.map(date => (
        <div key={date} style={{ marginBottom: 20 }}>
          <h2 style={s.sectionLabel}>{date === todayKey() ? "Today" : prettyDate(date)}</h2>
          {sessions.filter(x => x.date === date).map(session => {
            const isExp = expanded[session.id];
            const vol = session.exercises.reduce((t, ex) => t + ex.sets.reduce((a, st) => a + (num(st.weight) || 0) * (num(st.reps) || 0), 0), 0);
            return (
              <div key={session.id} style={s.sessionCard}>
                <div style={s.sessionCardHeader} onClick={() => toggle(session.id)}>
                  <div>
                    <div style={s.sessionCardTitle}>{session.dayLabel}</div>
                    <div style={s.sessionCardMeta}>
                      {vol > 0 && <span style={s.sportTag}>{Math.round(vol).toLocaleString()} total volume</span>}
                      {session.rpe && <span style={s.rpeTag}>RPE {session.rpe}</span>}
                    </div>
                  </div>
                  <span style={s.expandChevron}>{isExp ? "▲" : "▼"}</span>
                </div>
                {isExp && (
                  <div style={s.sessionCardBody}>
                    {session.exercises.map((ex, ei) => (
                      <div key={ei} style={s.logExBlock}>
                        <div style={s.logExName}>{ex.name} <span style={s.logExPlanned}>({ex.planned})</span></div>
                        <div style={s.logSetsGrid}>
                          {ex.sets.map((st, si) => (
                            <div key={si} style={{ ...s.logSetRow, ...(st.done ? s.logSetDone : {}) }}>
                              <span style={s.setNum}>{si + 1}</span>
                              <span style={s.logCell}>{st.weight ? `${st.weight} ${st.unit}` : "BW"}</span>
                              <span style={s.logCell}>× {st.reps || "—"}</span>
                              <span style={s.logCell}>{st.done ? "✓" : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {session.notes && <div style={s.sessionNotes}><span style={s.sessionNotesLabel}>Notes: </span>{session.notes}</div>}
                    {confirm === session.id
                      ? <div style={{display:"flex",gap:8,marginTop:12}}>
                          <button style={{...s.deleteBtn, marginTop:0, background: colors.coral, color: colors.paper}} onClick={() => deleteSession(session.id)}>Yes, delete</button>
                          <button style={{...s.deleteBtn, marginTop:0, color: colors.paperDim, borderColor: colors.line}} onClick={() => setConfirm(null)}>Keep</button>
                        </div>
                      : <button style={s.deleteBtn} onClick={() => setConfirm(session.id)}>Delete session</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── PROGRESS TAB ─────────────────────────────────────────────────
function weekStart(k) { const d = keyToDate(k); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return localKey(d); }

function ProgressTab({ weighins, setWeighins, waist, setWaist, sessions }) {
  const today = todayKey();
  const [w, setW] = useState(weighins[today] ? String(weighins[today]) : "");
  const [wa, setWa] = useState("");
  const [saved, setSaved] = useState("");

  const weeks = useMemo(() => {
    const m = {};
    for (const [k, v] of Object.entries(weighins)) { const ws = weekStart(k); (m[ws] = m[ws] || []).push(v); }
    return Object.keys(m).sort().map(ws => ({ week: ws, avg: r1(avg(m[ws])), n: m[ws].length }));
  }, [weighins]);
  const waistList = useMemo(() => Object.entries(waist).sort(([a], [b]) => a < b ? -1 : 1).map(([date, v]) => ({ date, v })), [waist]);

  const saveWeight = () => { const n = num(w); if (n === null || n < 60 || n > 600) return; setWeighins(p => ({ ...p, [today]: n })); setSaved("Weight saved"); };
  const saveWaist = () => { const n = num(wa); if (n === null || n < 15 || n > 80) return; setWaist(p => ({ ...p, [today]: n })); setWa(""); setSaved("Waist saved"); };

  // adjustment rule: compare the latest complete-ish week to two weeks before
  const cur = weeks[weeks.length - 1], prev2 = weeks.find(x => x.week === addDays(cur?.week || today, -14));
  const rate = cur && prev2 ? r1((prev2.avg - cur.avg) / 2) : null;
  const lastWaist = waistList[waistList.length - 1];
  const oldWaist = lastWaist ? [...waistList].reverse().find(x => daysBetween(x.date, lastWaist.date) >= 14) : null;
  const waistDown = lastWaist && oldWaist ? lastWaist.v < oldWaist.v : null;
  let verdict = null;
  if (rate !== null) {
    if (rate > 2.5) verdict = { c: colors.coral, t: `Losing ${rate} lb/week — too fast. Add 1 cupped hand of carbs to one meal a day.` };
    else if (rate >= 1) verdict = { c: colors.sage, t: `Losing ${rate} lb/week. On target — change nothing.` };
    else if (rate >= 0.5) verdict = { c: colors.amber, t: `Losing ${rate} lb/week. Fine for the finish phase; in months 1–6 consider trimming carbs slightly.` };
    else if (waistDown) verdict = { c: colors.sage, t: "Weight steady but waist shrinking — recomp is working. Change nothing." };
    else verdict = { c: colors.coral, t: "Stalled for 2 weeks. Cut 1 cupped hand of carbs from one meal a day, or add 2,000 daily steps." };
  }

  // key lifts — best top-set weight per session over time
  const lifts = ["Barbell Bench Press", "Back Squat", "Trap-Bar Deadlift", "Seated DB Shoulder Press"];
  const liftData = lifts.map(name => {
    const pts = [];
    for (const sess of [...sessions].reverse()) {
      if (sess.deload) continue;
      const ex = sess.exercises.find(e => e.name === name);
      const ws = ex ? ex.sets.map(st => num(st.weight)).filter(x => x !== null) : [];
      if (ws.length) pts.push({ x: sess.date, y: Math.max(...ws) });
    }
    return { name, pts };
  }).filter(l => l.pts.length);

  return (
    <div>
      <section style={s.card}>
        <h2 style={s.cardTitle}>Today's weigh-in</h2>
        <div style={s.inlineForm}>
          <input style={{...s.input, marginBottom: 0}} inputMode="decimal" placeholder="lb, first thing" value={w} onChange={e => { setW(e.target.value); setSaved(""); }} />
          <button style={s.smallBtn} onClick={saveWeight}>Save</button>
        </div>
        <div style={{...s.inlineForm, marginTop: 10}}>
          <input style={{...s.input, marginBottom: 0}} inputMode="decimal" placeholder="Waist, inches" value={wa} onChange={e => { setWa(e.target.value); setSaved(""); }} />
          <button style={s.smallBtn} onClick={saveWaist}>Save</button>
        </div>
        {saved && <div style={{...s.hint, color: colors.sage, marginTop: 8}}>✓ {saved}</div>}
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Weekly average weight</h2>
        {weeks.length < 2
          ? <p style={s.bodyText}>Weigh in daily. The chart starts once you have two weeks of data{weeks.length ? ` (this week so far: ${weeks[0].avg} lb)` : ""}.</p>
          : <LineChart points={weeks.map(x => ({ x: x.week, y: x.avg }))} unit="lb" color={colors.amber} />}
        {verdict && <div style={{...s.verdict, borderColor: verdict.c, color: verdict.c}}>{verdict.t}</div>}
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Waist</h2>
        {waistList.length < 2
          ? <p style={s.bodyText}>Measure at the navel once a week, same day.{lastWaist ? ` Latest: ${lastWaist.v} in.` : ""}</p>
          : <LineChart points={waistList.map(x => ({ x: x.date, y: x.v }))} unit="in" color={colors.sage} />}
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Key lifts — top set</h2>
        {liftData.length === 0
          ? <p style={s.bodyText}>Log a few sessions and your bench, squat, deadlift and press trends show here.</p>
          : liftData.map(l => (
              <div key={l.name} style={{ marginBottom: 16 }}>
                <div style={s.liftHead}><span>{l.name}</span><span style={s.exSetsReps}>{l.pts[l.pts.length - 1].y} lb{l.pts.length > 1 ? ` (${l.pts[l.pts.length - 1].y - l.pts[0].y >= 0 ? "+" : ""}${r1(l.pts[l.pts.length - 1].y - l.pts[0].y)})` : ""}</span></div>
                {l.pts.length > 1 && <LineChart points={l.pts} unit="lb" color={colors.paper} small />}
              </div>
            ))}
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Monthly photos</h2>
        <p style={{...s.bodyText, margin: 0}}>Front, side and back in the same light, once a month. You're done cutting when you can see the outline of your abs in normal light and your waist has stopped shrinking.</p>
      </section>
    </div>
  );
}

function LineChart({ points, unit, color, small }) {
  const W = 320, H = small ? 70 : 140, P = { l: 34, r: 10, t: 10, b: small ? 8 : 20 };
  const ys = points.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const X = i => P.l + (points.length === 1 ? 0 : i * (W - P.l - P.r) / (points.length - 1));
  const Y = v => P.t + (hi - v) * (H - P.t - P.b) / (hi - lo);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={`Trend, latest ${last.y} ${unit}`}>
      {[hi - pad, lo + pad].map((v, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} stroke={colors.line} />
          <text x={P.l - 6} y={Y(v) + 4} textAnchor="end" style={s.axisText}>{Math.round(v)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r={i === points.length - 1 ? 4 : 2.5} fill={color} />)}
      {!small && <>
        <text x={P.l} y={H - 4} style={s.axisText}>{shortDate(points[0].x)}</text>
        <text x={W - P.r} y={H - 4} textAnchor="end" style={s.axisText}>{shortDate(last.x)}</text>
      </>}
    </svg>
  );
}

// ── FOOD TAB ─────────────────────────────────────────────────────
const MEAL_ITEMS = [
  ["protein", "Protein — 2 palms"],
  ["veg", "Vegetables — 2 fists"],
  ["carbs", null],
  ["fat", "Fat — 1 thumb"],
];
const HABITS = [
  ["snack", "Protein snack — shake or 1 palm + fruit"],
  ["steps", "8,000+ steps"],
  ["water", "No liquid calories"],
  ["alcohol", "No alcohol today"],
];

function FoodTab({ food, setFood, sessions }) {
  const today = todayKey();
  const trainedToday = sessions.some(x => x.date === today);
  const day = food[today] || { training: trainedToday, checks: {} };
  const training = day.training ?? trainedToday;
  const set = patch => setFood(p => ({ ...p, [today]: { ...day, training, ...patch } }));
  const toggle = key => set({ checks: { ...day.checks, [key]: !day.checks[key] } });
  const total = 3 * MEAL_ITEMS.length + HABITS.length;
  const score = d => d ? Object.values(d.checks || {}).filter(Boolean).length : 0;
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <div>
      <section style={s.card}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
          <h2 style={{...s.cardTitle, margin: 0}}>Today</h2>
          <span style={s.exSetsReps}>{score(day)}/{total}</span>
        </div>
        <div style={{...s.sportSwitch, padding: "12px 0 4px"}}>
          {[[true, "Training day"], [false, "Rest day"]].map(([v, label]) => (
            <button key={label} onClick={() => set({ training: v })} style={{...s.sportBtn, ...(training === v ? s.sportBtnActive : {})}}>{label}</button>
          ))}
        </div>
        {[1, 2, 3].map(m => (
          <div key={m} style={{ marginTop: 14 }}>
            <div style={s.miniLabel}>Meal {m}</div>
            {MEAL_ITEMS.map(([k, label]) => {
              const key = `m${m}-${k}`;
              const text = label || `Carbs — ${training ? "2 cupped hands" : "1 cupped hand"}`;
              return <Check key={key} on={!!day.checks[key]} label={text} onClick={() => toggle(key)} />;
            })}
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={s.miniLabel}>Habits</div>
          {HABITS.map(([k, label]) => <Check key={k} on={!!day.checks[k]} label={label} onClick={() => toggle(k)} />)}
        </div>
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Last 7 days</h2>
        <div style={s.weekRow}>
          {last7.map(k => {
            const sc = score(food[k]), pct = sc / total;
            return (
              <div key={k} style={s.weekCell}>
                <div style={s.weekBarWrap}><div style={{...s.weekBar, height: `${Math.max(4, pct * 100)}%`, background: pct >= 0.8 ? colors.sage : pct >= 0.5 ? colors.amber : colors.coral, opacity: sc ? 1 : 0.25}} /></div>
                <span style={s.statLabel}>{keyToDate(k).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              </div>
            );
          })}
        </div>
        <p style={{...s.bodyText, margin: "10px 0 0"}}>Aim for 80%+ most days. About 3–4 off-plan meals a week is fine — keep the protein even then.</p>
      </section>

      <section style={s.card}>
        <h2 style={s.cardTitle}>Sample training day</h2>
        <ul style={s.tipList}>
          <li style={s.tipItem}><b>Breakfast:</b> 3 eggs + 1 cup egg whites, spinach and peppers, 1 cupped hand of oats with berries</li>
          <li style={s.tipItem}><b>Lunch:</b> 2 palms chicken thigh, big salad, 1 cupped hand rice, 1 thumb olive-oil dressing</li>
          <li style={s.tipItem}><b>Around training:</b> protein shake + banana</li>
          <li style={s.tipItem}><b>Dinner:</b> 2 palms salmon or lean steak, 2 fists roasted veg, 1 cupped hand potatoes</li>
        </ul>
        <p style={{...s.bodyText, margin: "8px 0 0"}}>Rest days: drop the banana and the oats or rice. Roughly 2,400–2,600 kcal and 180–200 g protein — the weekly check-in in Progress does the fine-tuning.</p>
      </section>
    </div>
  );
}

function Check({ on, label, onClick }) {
  return (
    <button style={s.checkRow} onClick={onClick} aria-pressed={on}>
      <span style={{ ...s.checkbox, ...(on ? s.checkboxDone : {}) }}>{on ? "✓" : ""}</span>
      <span style={{ ...s.checkLabel, ...(on ? { color: colors.sage } : {}) }}>{label}</span>
    </button>
  );
}

// ── TIMER TAB (conditioning intervals) ───────────────────────────
const PRESETS = [
  { name: "Bike Sprints",  work: 20, rest: 40, rounds: 8 },
  { name: "Sled Push",     work: 20, rest: 60, rounds: 6 },
  { name: "Rower Intervals", work: 30, rest: 30, rounds: 10 },
  { name: "Tabata",        work: 20, rest: 10, rounds: 8 },
];

function TimerTab({ pendingPreset, onConsumePreset }) {
  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(40);
  const [rounds, setRounds]   = useState(8);
  const [running, setRunning] = useState(false);
  const [phase, setPhase]     = useState("work");
  const [round, setRound]     = useState(1);
  const [remaining, setRemaining] = useState(20);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!pendingPreset) return;
    const p = PRESETS.find(pr => pr.name === pendingPreset);
    if (p) { setRunning(false); setPhase("work"); setRound(1); setWorkSec(p.work); setRestSec(p.rest); setRounds(p.rounds); setRemaining(p.work); }
    onConsumePreset();
  }, [pendingPreset]);

  useEffect(() => { if (!running) setRemaining(phase === "work" ? workSec : restSec); }, [workSec, restSec]);

  const reset = useCallback(() => { setRunning(false); setPhase("work"); setRound(1); setRemaining(workSec); if (intervalRef.current) clearInterval(intervalRef.current); }, [workSec]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1;
        buzz();
        setPhase(prev => {
          if (prev === "work") return "rest";
          setRound(rd => { const n = rd + 1; if (n > rounds) setRunning(false); return n; });
          return "work";
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, rounds]);

  useEffect(() => { if (remaining === 0 && running) setRemaining(phase === "work" ? workSec : restSec); }, [phase]);

  const done = round > rounds;
  const ringColor = phase === "work" ? colors.amber : colors.coral;
  const total = phase === "work" ? workSec : restSec;
  const pct = Math.max(0, Math.min(1, remaining / Math.max(1, total)));

  return (
    <div>
      <p style={s.programIntro}>Rest between lifting sets runs automatically when you tick a set. This timer is for conditioning.</p>
      <section style={s.timerCard}>
        <div style={s.timerStatusRow}>
          <span style={{ ...s.phasePill, background: phase === "work" ? colors.amber : colors.coral, color: colors.ink }}>{done ? "complete" : phase}</span>
          <span style={s.roundText}>Round {Math.min(round, rounds)} / {rounds}</span>
        </div>
        <div style={s.ringWrap}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="98" fill="none" stroke={colors.line} strokeWidth="10"/>
            <circle cx="110" cy="110" r="98" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={2*Math.PI*98} strokeDashoffset={2*Math.PI*98*(1-pct)}
              transform="rotate(-90 110 110)" style={{ transition: "stroke-dashoffset 0.95s linear" }}/>
          </svg>
          <div style={s.ringCenter}><div style={s.clockText}>{done ? "Done" : fmtClock(remaining)}</div></div>
        </div>
        <div style={s.timerButtons}>
          {!running
            ? <button style={s.primaryBtn} onClick={() => { if (done) reset(); setRunning(true); }}>{round===1&&phase==="work"&&remaining===workSec?"Start":"Resume"}</button>
            : <button style={s.secondaryBtn} onClick={() => setRunning(false)}>Pause</button>}
          <button style={s.ghostBtn} onClick={reset}>Reset</button>
        </div>
      </section>
      <section style={s.card}>
        <h2 style={s.cardTitle}>Presets</h2>
        <div style={s.presetGrid}>
          {PRESETS.map(p => (
            <button key={p.name} disabled={running} style={{ ...s.presetBtn, opacity: running ? .5 : 1 }}
              onClick={() => { setWorkSec(p.work); setRestSec(p.rest); setRounds(p.rounds); setPhase("work"); setRound(1); setRemaining(p.work); }}>
              <span style={s.presetName}>{p.name}</span>
              <span style={s.presetDetail}>{p.work}s / {p.rest}s × {p.rounds}</span>
            </button>
          ))}
        </div>
      </section>
      <section style={s.card}>
        <h2 style={s.cardTitle}>Interval settings</h2>
        <div style={s.row3}>
          <NumberField label="Work (sec)" value={workSec} onChange={setWorkSec} disabled={running}/>
          <NumberField label="Rest (sec)" value={restSec} onChange={setRestSec} disabled={running}/>
          <NumberField label="Rounds"     value={rounds}  onChange={setRounds}  disabled={running}/>
        </div>
        {running && <div style={s.lockNote}>Pause to edit settings.</div>}
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, disabled }) {
  return (
    <div style={s.smallInputWrap}>
      <label style={s.miniLabel}>{label}</label>
      <input style={{ ...s.input, opacity: disabled ? .5 : 1 }} inputMode="numeric" value={value} disabled={disabled}
        onChange={e => { const v = e.target.value.replace(/[^0-9]/g,""); onChange(v===""?0:parseInt(v,10)); }}/>
    </div>
  );
}

// ── DESIGN TOKENS ─────────────────────────────────────────────────
const colors = {
  mat:"#2E2C29", matDeep:"#262420", paper:"#F2EFE9", paperDim:"#C9C3B6",
  amber:"#E8B33D", sage:"#8C9A88", coral:"#D1603D", line:"rgba(242,239,233,0.14)", ink:"#211F1C",
};

const bebas = "'Bebas Neue','Inter',sans-serif";
const mono = "'JetBrains Mono',monospace";

const s = {
  app:{minHeight:"100vh",background:colors.mat,color:colors.paper,fontFamily:"'Inter',sans-serif",paddingBottom:48},
  header:{position:"sticky",top:0,zIndex:5,background:colors.matDeep,borderBottom:`1px solid ${colors.line}`,paddingTop:"max(18px, env(safe-area-inset-top))"},
  headerInner:{display:"flex",alignItems:"baseline",justifyContent:"space-between",padding:"0 20px"},
  wordmark:{fontFamily:bebas,fontSize:32,letterSpacing:"0.08em",margin:0,color:colors.paper},
  dateChip:{fontFamily:mono,fontSize:12,color:colors.amber,letterSpacing:"0.04em"},
  sportSwitch:{display:"flex",gap:8,padding:"12px 20px 0"},
  sportBtn:{flex:1,background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:20,color:colors.paperDim,fontFamily:bebas,fontSize:15,letterSpacing:"0.04em",padding:"9px 0",cursor:"pointer",minHeight:40},
  sportBtnActive:{background:colors.amber,color:colors.ink,border:`1px solid ${colors.amber}`},
  tabs:{display:"flex",gap:0,marginTop:12,padding:"0 8px",overflowX:"auto"},
  tabBtn:{flex:"1 0 auto",padding:"12px 8px",background:"transparent",border:"none",borderBottom:`3px solid transparent`,color:colors.paperDim,fontFamily:bebas,fontSize:15,letterSpacing:"0.04em",cursor:"pointer",whiteSpace:"nowrap"},
  tabBtnActive:{color:colors.paper,borderBottom:`3px solid ${colors.amber}`},
  main:{maxWidth:480,margin:"0 auto",padding:"20px 16px 0"},
  card:{background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,padding:18,marginBottom:18},
  cardTitle:{fontFamily:bebas,fontSize:20,letterSpacing:"0.05em",margin:"0 0 14px",color:colors.paper},
  bodyText:{fontSize:14,color:colors.paperDim,lineHeight:1.5,margin:"0 0 12px"},
  tipList:{margin:0,paddingLeft:18},
  tipItem:{fontSize:14,color:colors.paper,lineHeight:1.55,marginBottom:7},
  disclaimer:{fontSize:12,color:colors.paperDim,fontStyle:"italic",lineHeight:1.5},
  input:{width:"100%",background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paper,fontFamily:mono,fontSize:16,padding:"11px 12px",marginBottom:12,boxSizing:"border-box"},
  inlineForm:{display:"flex",gap:8},
  smallBtn:{background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:bebas,fontSize:16,letterSpacing:"0.05em",padding:"0 18px",cursor:"pointer",minHeight:44},
  row3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10},
  smallInputWrap:{display:"flex",flexDirection:"column"},
  miniLabel:{fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",color:colors.paperDim,marginBottom:6},
  hint:{fontSize:12,color:colors.sage,lineHeight:1.4,fontFamily:mono},
  primaryBtn:{width:"100%",background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:bebas,fontSize:17,letterSpacing:"0.05em",padding:"13px 0",cursor:"pointer"},
  secondaryBtn:{flex:1,background:colors.coral,color:colors.paper,border:"none",borderRadius:3,fontFamily:bebas,fontSize:17,letterSpacing:"0.05em",padding:"13px 0",cursor:"pointer"},
  ghostBtn:{flex:1,background:"transparent",color:colors.paperDim,border:`1px solid ${colors.line}`,borderRadius:3,fontFamily:bebas,fontSize:17,letterSpacing:"0.05em",padding:"13px 0",cursor:"pointer"},
  sectionLabel:{fontFamily:bebas,fontSize:16,letterSpacing:"0.06em",color:colors.paperDim,margin:"0 0 10px"},
  empty:{color:colors.paperDim,fontSize:14,border:`1px dashed ${colors.line}`,borderRadius:4,padding:"24px 18px"},
  // TODAY
  statRow:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,marginBottom:18},
  stat:{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,padding:"10px 4px",cursor:"pointer",color:colors.paper},
  statValue:{fontFamily:mono,fontSize:17,fontWeight:700,color:colors.paper},
  statLabel:{fontSize:10,color:colors.paperDim,textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center"},
  doneNote:{fontSize:13,color:colors.sage,marginBottom:14,fontFamily:mono},
  pickRow:{display:"flex",alignItems:"center",gap:8,marginTop:14,flexWrap:"wrap"},
  chipBtn:{background:"transparent",border:`1px solid ${colors.line}`,borderRadius:20,color:colors.paper,fontFamily:bebas,fontSize:14,letterSpacing:"0.04em",padding:"7px 14px",cursor:"pointer"},
  // PLAN
  programIntro:{fontSize:13.5,color:colors.paperDim,lineHeight:1.5,marginBottom:18},
  table:{width:"100%",borderCollapse:"collapse"},
  td:{fontSize:14,padding:"6px 0",borderBottom:`1px solid ${colors.line}`},
  tdDay:{fontFamily:mono,fontSize:12.5,color:colors.amber,padding:"6px 0",width:56,borderBottom:`1px solid ${colors.line}`},
  cycleBlock:{border:`1px solid ${colors.line}`,borderRadius:4,marginBottom:12,overflow:"hidden"},
  cycleHeader:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:colors.matDeep,border:"none",padding:"14px 16px",cursor:"pointer",textAlign:"left"},
  cycleName:{fontFamily:bebas,fontSize:19,letterSpacing:"0.05em",color:colors.amber},
  cycleSpan:{fontFamily:mono,fontSize:11,color:colors.sage,marginTop:2},
  phaseBody:{padding:"4px 14px 14px",background:colors.matDeep},
  checkbox:{width:24,height:24,flexShrink:0,borderRadius:"50%",border:`1px solid ${colors.paperDim}`,background:"transparent",color:colors.ink,fontSize:13,lineHeight:"22px",textAlign:"center",display:"inline-block"},
  checkboxDone:{background:colors.sage,border:`1px solid ${colors.sage}`,color:colors.ink},
  checkRow:{display:"flex",alignItems:"center",gap:12,width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${colors.line}`,padding:"10px 0",cursor:"pointer",textAlign:"left",minHeight:44},
  checkLabel:{fontSize:14,color:colors.paper},
  exList:{listStyle:"none",margin:0,padding:0},
  exItem:{display:"flex",justifyContent:"space-between",gap:10,fontSize:14,padding:"6px 0",borderBottom:`1px solid ${colors.line}`},
  exSetsReps:{fontFamily:mono,fontSize:12.5,color:colors.amber,whiteSpace:"nowrap"},
  dayActions:{display:"flex",gap:8,marginTop:14},
  dayActionBtn:{flex:1,background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:bebas,fontSize:17,letterSpacing:"0.05em",padding:"12px 0",cursor:"pointer"},
  dayActionBtnAlt:{flex:1,background:"transparent",color:colors.paper,border:`1px solid ${colors.paperDim}`,borderRadius:3,fontFamily:bebas,fontSize:17,letterSpacing:"0.05em",padding:"12px 0",cursor:"pointer"},
  // PROGRESS
  verdict:{marginTop:14,border:"1px solid",borderRadius:4,padding:"10px 12px",fontSize:13.5,lineHeight:1.45},
  axisText:{fontFamily:mono,fontSize:10,fill:colors.paperDim},
  liftHead:{display:"flex",justifyContent:"space-between",gap:10,fontSize:14,marginBottom:6},
  // FOOD
  weekRow:{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:8},
  weekCell:{display:"flex",flexDirection:"column",alignItems:"center",gap:6},
  weekBarWrap:{height:60,width:"100%",maxWidth:28,background:colors.mat,borderRadius:3,display:"flex",alignItems:"flex-end",overflow:"hidden"},
  weekBar:{width:"100%",borderRadius:3},
  // MODAL
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modal:{background:colors.matDeep,borderRadius:"12px 12px 0 0",width:"100%",maxWidth:500,maxHeight:"94vh",display:"flex",flexDirection:"column"},
  modalHeader:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"18px 18px 14px",borderBottom:`1px solid ${colors.line}`},
  modalTitle:{fontFamily:bebas,fontSize:20,letterSpacing:"0.05em",color:colors.paper},
  modalSub:{fontSize:12,color:colors.sage,marginTop:3,fontFamily:mono},
  closeBtn:{background:"transparent",border:`1px solid ${colors.line}`,borderRadius:"50%",color:colors.paperDim,width:34,height:34,cursor:"pointer",fontSize:13,flexShrink:0},
  restBar:{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",color:colors.ink,fontFamily:bebas,fontSize:16,letterSpacing:"0.04em"},
  restClock:{marginLeft:"auto",fontFamily:mono,fontSize:20,fontWeight:700},
  restSkip:{background:"rgba(0,0,0,0.15)",border:"none",borderRadius:3,color:colors.ink,fontFamily:bebas,fontSize:14,padding:"6px 12px",cursor:"pointer"},
  modalBody:{flex:1,overflowY:"auto",padding:"0 18px 8px"},
  modalFooter:{display:"flex",gap:10,padding:"14px 18px max(24px, env(safe-area-inset-bottom))",borderTop:`1px solid ${colors.line}`},
  cancelBtn:{flex:1,background:"transparent",color:colors.paperDim,border:`1px solid ${colors.line}`,borderRadius:3,fontFamily:bebas,fontSize:16,letterSpacing:"0.04em",padding:"12px 0",cursor:"pointer"},
  saveBtn:{flex:2,background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:bebas,fontSize:16,letterSpacing:"0.04em",padding:"12px 0",cursor:"pointer"},
  exBlock:{paddingBottom:16,marginBottom:16,borderBottom:`1px solid ${colors.line}`},
  exBlockHeader:{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"14px 0 4px"},
  exBlockName:{fontFamily:bebas,fontSize:17,letterSpacing:"0.04em",color:colors.paper},
  exBlockPlanned:{fontSize:11,color:colors.sage,fontFamily:mono,whiteSpace:"nowrap"},
  setGrid:{display:"flex",flexDirection:"column",gap:4,marginTop:8},
  setGridHeader:{display:"grid",gridTemplateColumns:"26px 1fr 1fr 52px 36px 24px",gap:6,fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",color:colors.paperDim,padding:"0 0 4px",borderBottom:`1px solid ${colors.line}`},
  setRow:{display:"grid",gridTemplateColumns:"26px 1fr 1fr 52px 36px 24px",gap:6,alignItems:"center",padding:"3px 0"},
  setRowDone:{opacity:0.55},
  setNum:{fontFamily:mono,fontSize:12,color:colors.sage,textAlign:"center"},
  setInput:{background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paper,fontFamily:mono,fontSize:16,padding:"8px 8px",width:"100%",minWidth:0},
  unitSel:{background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paperDim,fontFamily:mono,fontSize:13,padding:"8px 2px",width:"100%"},
  doneBtn:{background:"transparent",border:`1px solid ${colors.line}`,borderRadius:"50%",color:colors.paperDim,width:34,height:34,cursor:"pointer",fontSize:13,padding:0},
  doneBtnActive:{background:colors.sage,border:`1px solid ${colors.sage}`,color:colors.ink},
  removeSetBtn:{background:"transparent",border:"none",color:colors.paperDim,cursor:"pointer",fontSize:13,padding:0},
  addSetBtn:{marginTop:10,background:"transparent",border:`1px dashed ${colors.line}`,borderRadius:3,color:colors.sage,fontFamily:mono,fontSize:12,padding:"8px 0",width:"100%",cursor:"pointer"},
  sessionMeta:{paddingTop:4},
  metaField:{marginBottom:12},
  metaLabel:{fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",color:colors.paperDim,display:"block",marginBottom:6},
  notesInput:{width:"100%",background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paper,fontFamily:"'Inter',sans-serif",fontSize:16,padding:"10px 12px",resize:"vertical",boxSizing:"border-box"},
  // LOG
  sessionCard:{background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,marginBottom:10,overflow:"hidden"},
  sessionCardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",cursor:"pointer"},
  sessionCardTitle:{fontFamily:bebas,fontSize:17,letterSpacing:"0.04em",color:colors.paper},
  sessionCardMeta:{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"},
  sportTag:{fontSize:11,background:"rgba(232,179,61,0.15)",color:colors.amber,padding:"2px 7px",borderRadius:10,fontFamily:mono},
  rpeTag:{fontSize:11,background:"rgba(209,96,61,0.2)",color:colors.coral,padding:"2px 7px",borderRadius:10,fontFamily:mono},
  expandChevron:{color:colors.paperDim,fontSize:13},
  sessionCardBody:{padding:"0 16px 16px",borderTop:`1px solid ${colors.line}`},
  logExBlock:{paddingTop:12},
  logExName:{fontFamily:bebas,fontSize:15,letterSpacing:"0.03em",color:colors.paper,marginBottom:6},
  logExPlanned:{fontSize:11,color:colors.sage,fontFamily:mono,fontWeight:"normal"},
  logSetsGrid:{display:"flex",flexDirection:"column"},
  logSetRow:{display:"grid",gridTemplateColumns:"26px 1fr 1fr 24px",gap:6,padding:"5px 0",borderBottom:`1px solid ${colors.line}`},
  logSetDone:{background:"rgba(140,154,136,0.08)"},
  logCell:{fontSize:13,fontFamily:mono,color:colors.paper},
  sessionNotes:{marginTop:12,fontSize:13,color:colors.paperDim,fontStyle:"italic",lineHeight:1.5},
  sessionNotesLabel:{color:colors.amber,fontStyle:"normal",fontWeight:600},
  deleteBtn:{marginTop:12,background:"transparent",border:`1px solid rgba(209,96,61,0.3)`,borderRadius:3,color:colors.coral,fontFamily:mono,fontSize:12,padding:"8px 12px",cursor:"pointer"},
  // TIMER
  timerCard:{background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,padding:22,marginBottom:18,display:"flex",flexDirection:"column",alignItems:"center"},
  timerStatusRow:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  phasePill:{fontFamily:bebas,fontSize:13,letterSpacing:"0.08em",textTransform:"uppercase",padding:"4px 10px",borderRadius:20},
  roundText:{fontFamily:mono,fontSize:13,color:colors.paperDim},
  ringWrap:{position:"relative",width:220,height:220,margin:"10px 0 18px"},
  ringCenter:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},
  clockText:{fontFamily:mono,fontSize:44,color:colors.paper,fontWeight:700},
  timerButtons:{display:"flex",gap:10,width:"100%"},
  lockNote:{marginTop:4,fontSize:12,color:colors.paperDim,fontStyle:"italic"},
  presetGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
  presetBtn:{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4,background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,padding:"10px 12px",cursor:"pointer",textAlign:"left"},
  presetName:{fontFamily:bebas,fontSize:15,letterSpacing:"0.03em",color:colors.paper},
  presetDetail:{fontFamily:mono,fontSize:11,color:colors.amber},
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;}
body{margin:0;background:${colors.mat};}
input:focus,select:focus,textarea:focus,button:focus-visible{outline:2px solid ${colors.amber};outline-offset:1px;}
button{transition:opacity 0.15s ease;-webkit-tap-highlight-color:transparent;}
button:hover{opacity:0.88;}
button:disabled{cursor:default;}
::placeholder{color:${colors.paperDim};opacity:0.6;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${colors.line};border-radius:2px;}
@media (prefers-reduced-motion: reduce){*{transition:none!important;}}
`;
