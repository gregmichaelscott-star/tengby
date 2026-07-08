import { useState, useEffect, useRef, useCallback } from "react";

// ── storage ──────────────────────────────────────────────────────
const STORE_SESSIONS = "tengby:sessions";
const STORE_PROGRESS = "tengby:program-progress";
const STORE_SPORT    = "tengby:sport";

const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// ── helpers ──────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().slice(0, 10);
const prettyDate = k => { const d = new Date(k + "T00:00:00"); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); };
const pad2 = n => String(n).padStart(2, "0");
const fmtClock = s => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
const uid = () => Math.random().toString(36).slice(2, 10);

// ── main app ─────────────────────────────────────────────────────
export default function Tengby() {
  const [tab, setTab]           = useState("program");
  const [sport, setSport]       = useState(() => load(STORE_SPORT, "rugby"));
  const [sessions, setSessions] = useState(() => load(STORE_SESSIONS, []));
  const [progress, setProgress] = useState(() => load(STORE_PROGRESS, {}));
  const [pendingPreset, setPendingPreset] = useState(null);
  const [logModal, setLogModal] = useState(null); // { day, phase, macroName }

  useEffect(() => { save(STORE_SESSIONS, sessions); }, [sessions]);
  useEffect(() => { save(STORE_PROGRESS, progress); }, [progress]);
  useEffect(() => { save(STORE_SPORT, sport); }, [sport]);

  const openLogModal = (day, phase, macroName) => setLogModal({ day, phase, macroName });

  const saveSession = (sessionData) => {
    setSessions(prev => [sessionData, ...prev]);
    setLogModal(null);
  };

  const deleteSession = id => setSessions(prev => prev.filter(s => s.id !== id));
  const toggleDayComplete = dayId => setProgress(p => ({ ...p, [dayId]: !p[dayId] }));
  const program = sport === "rugby" ? RUGBY_PROGRAM : TENNIS_PROGRAM;

  return (
    <div style={s.app}>
      <style>{css}</style>

      {/* HEADER */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <h1 style={s.wordmark}>TENGBY</h1>
          <span style={s.dateChip}>{prettyDate(todayKey())}</span>
        </div>
        <div style={s.sportSwitch}>
          {[["rugby","Rugby Sevens"],["tennis","Tennis"]].map(([id,label]) => (
            <button key={id} onClick={() => setSport(id)}
              style={{...s.sportBtn, ...(sport===id ? s.sportBtnActive : {})}}>
              {label}
            </button>
          ))}
        </div>
        <nav style={s.tabs}>
          {[["program","Program"],["log","Log"],["timer","Timer"],["nutrition","Nutrition"],["stretch","Stretch"],["hydration","Hydrate"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{...s.tabBtn, ...(tab===id ? s.tabBtnActive : {})}}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={s.main}>
        {tab === "program"   && <ProgramTab program={program} progress={progress} toggleDayComplete={toggleDayComplete} openLogModal={openLogModal} onStartTimer={p => { setPendingPreset(p); setTab("timer"); }} />}
        {tab === "log"       && <LogTab sessions={sessions} deleteSession={deleteSession} />}
        {tab === "timer"     && <TimerTab pendingPreset={pendingPreset} onConsumePreset={() => setPendingPreset(null)} sport={sport} />}
        {tab === "nutrition" && <NutritionTab sport={sport} />}
        {tab === "stretch"   && <StretchTab sport={sport} />}
        {tab === "hydration" && <HydrationTab />}
      </main>

      {/* LOG MODAL */}
      {logModal && (
        <LogModal
          day={logModal.day}
          phase={logModal.phase}
          macroName={logModal.macroName}
          sport={sport}
          onSave={saveSession}
          onClose={() => setLogModal(null)}
        />
      )}
    </div>
  );
}

// ── LOG MODAL ────────────────────────────────────────────────────
function LogModal({ day, phase, macroName, sport, onSave, onClose }) {
  const initSets = ex => Array.from({ length: parseInt(ex.sets) || 3 }, () => ({
    reps: ex.reps || "", weight: "", unit: "kg", time: "", done: false
  }));

  const [exData, setExData] = useState(() => day.exercises.map(ex => ({ ...ex, loggedSets: initSets(ex) })));
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState("");

  const updateSet = (ei, si, field, val) => {
    setExData(prev => prev.map((ex, i) => i !== ei ? ex : {
      ...ex,
      loggedSets: ex.loggedSets.map((st, j) => j !== si ? st : { ...st, [field]: val })
    }));
  };

  const toggleSetDone = (ei, si) => updateSet(ei, si, "done", !exData[ei].loggedSets[si].done);

  const addSet = ei => setExData(prev => prev.map((ex, i) => i !== ei ? ex : {
    ...ex,
    loggedSets: [...ex.loggedSets, { reps: ex.reps || "", weight: ex.loggedSets[ex.loggedSets.length-1]?.weight || "", unit: ex.loggedSets[ex.loggedSets.length-1]?.unit || "kg", time: "", done: false }]
  }));

  const removeSet = (ei, si) => setExData(prev => prev.map((ex, i) => i !== ei ? ex : ({
    ...ex, loggedSets: ex.loggedSets.filter((_, j) => j !== si)
  })));

  const handleSave = () => {
    onSave({
      id: uid(),
      date: todayKey(),
      ts: Date.now(),
      dayId: day.id,
      dayLabel: day.label,
      phase,
      macroName,
      sport,
      exercises: exData.map(ex => ({
        name: ex.name,
        planned: `${ex.sets} × ${ex.reps}`,
        sets: ex.loggedSets
      })),
      notes,
      rpe
    });
  };

  // Is exercise time-based (no weight)?
  const isTimeBased = ex => ex.reps && /min|sec|see timer/.test(ex.reps);

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>{day.label}</div>
            <div style={s.modalSub}>{macroName} · {phase}</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.modalBody}>
          {exData.map((ex, ei) => (
            <div key={ei} style={s.exBlock}>
              <div style={s.exBlockHeader}>
                <span style={s.exBlockName}>{ex.name}</span>
                <span style={s.exBlockPlanned}>Planned: {ex.sets} × {ex.reps}</span>
              </div>

              {/* Set rows */}
              <div style={s.setGrid}>
                <div style={s.setGridHeader}>
                  <span>Set</span>
                  {!isTimeBased(ex) && <span>Reps</span>}
                  {!isTimeBased(ex) && <span>Weight</span>}
                  {(isTimeBased(ex) || ex.reps?.includes('sec') || ex.reps?.includes('min')) && <span>Time</span>}
                  {!isTimeBased(ex) && <span style={{opacity:0}}>u</span>}
                  <span>✓</span>
                  <span></span>
                </div>
                {ex.loggedSets.map((st, si) => (
                  <div key={si} style={{...s.setRow, ...(st.done ? s.setRowDone : {})}}>
                    <span style={s.setNum}>{si + 1}</span>

                    {!isTimeBased(ex) && (
                      <input
                        style={s.setInput}
                        placeholder={ex.reps}
                        value={st.reps}
                        inputMode="numeric"
                        onChange={e => updateSet(ei, si, "reps", e.target.value)}
                      />
                    )}

                    {!isTimeBased(ex) && (
                      <input
                        style={s.setInput}
                        placeholder="0"
                        value={st.weight}
                        inputMode="decimal"
                        onChange={e => updateSet(ei, si, "weight", e.target.value)}
                      />
                    )}

                    {(isTimeBased(ex) || ex.reps?.includes('sec') || ex.reps?.includes('min')) && (
                      <input
                        style={{...s.setInput, flex: 2}}
                        placeholder="e.g. 6.2s"
                        value={st.time}
                        onChange={e => updateSet(ei, si, "time", e.target.value)}
                      />
                    )}

                    {!isTimeBased(ex) && (
                      <select style={s.unitSel} value={st.unit} onChange={e => updateSet(ei, si, "unit", e.target.value)}>
                        <option>kg</option>
                        <option>lb</option>
                      </select>
                    )}

                    <button style={{...s.doneBtn, ...(st.done ? s.doneBtnActive : {})}} onClick={() => toggleSetDone(ei, si)}>
                      {st.done ? "✓" : "○"}
                    </button>

                    <button style={s.removeSetBtn} onClick={() => removeSet(ei, si)}>✕</button>
                  </div>
                ))}
              </div>

              <button style={s.addSetBtn} onClick={() => addSet(ei)}>+ Add set</button>
            </div>
          ))}

          {/* RPE + Notes */}
          <div style={s.sessionMeta}>
            <div style={s.metaField}>
              <label style={s.metaLabel}>RPE (1–10)</label>
              <input style={{...s.setInput, width: 80}} placeholder="7" value={rpe} inputMode="numeric" onChange={e => setRpe(e.target.value)} />
            </div>
            <div style={{...s.metaField, flex: 1}}>
              <label style={s.metaLabel}>Session notes</label>
              <textarea style={s.notesInput} placeholder="How did it feel? Any PRs, issues, observations..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
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

// ── PROGRAM TAB ──────────────────────────────────────────────────
function ProgramTab({ program, progress, toggleDayComplete, openLogModal, onStartTimer }) {
  const [openCycle, setOpenCycle] = useState(program.macrocycles[0].id);
  const [openBlock, setOpenBlock] = useState(null);

  return (
    <div>
      <div style={s.programIntro}>{program.intro}</div>
      {program.macrocycles.map(cycle => {
        const isOpen = openCycle === cycle.id;
        const allDays = cycle.blocks.flatMap(b => b.days);
        const done = allDays.filter(d => progress[d.id]).length;
        return (
          <div key={cycle.id} style={s.cycleBlock}>
            <button style={s.cycleHeader} onClick={() => setOpenCycle(isOpen ? null : cycle.id)}>
              <div>
                <div style={s.cycleName}>{cycle.name}</div>
                <div style={s.cycleSpan}>{cycle.span}</div>
              </div>
              <div style={s.phaseRight}>
                <span style={s.phaseProgress}>{done}/{allDays.length}</span>
                <span>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              <div style={s.cycleBody}>
                {cycle.blocks.map(block => {
                  const key = `${cycle.id}__${block.id}`;
                  const bOpen = openBlock === key;
                  return (
                    <div key={block.id} style={s.phaseBlock}>
                      <button style={s.phaseHeader} onClick={() => setOpenBlock(bOpen ? null : key)}>
                        <div>
                          <div style={s.phaseName}>{block.name}</div>
                          <div style={s.phaseSpan}>{block.span}</div>
                        </div>
                        <span>{bOpen ? "▲" : "▼"}</span>
                      </button>
                      {bOpen && (
                        <div style={s.phaseBody}>
                          <p style={s.phaseBlurb}>{block.blurb}</p>
                          {block.days.map(day => (
                            <ProgramDay
                              key={day.id}
                              day={day}
                              complete={!!progress[day.id]}
                              onToggleComplete={() => toggleDayComplete(day.id)}
                              onLog={() => openLogModal(day, block.name, cycle.name)}
                              onStartTimer={day.timerPreset ? () => onStartTimer(day.timerPreset) : null}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgramDay({ day, complete, onToggleComplete, onLog, onStartTimer }) {
  return (
    <div style={s.dayCard}>
      <div style={s.dayHeader}>
        <button style={{ ...s.checkbox, ...(complete ? s.checkboxDone : {}) }} onClick={onToggleComplete}>
          {complete ? "✓" : ""}
        </button>
        <span style={{ ...s.dayLabel, ...(complete ? s.dayLabelDone : {}) }}>{day.label}</span>
      </div>
      <ul style={s.exList}>
        {day.exercises.map((ex, i) => (
          <li key={i} style={s.exItem}>
            <span>{ex.name}</span>
            <span style={s.exSetsReps}>{ex.sets} × {ex.reps}</span>
          </li>
        ))}
      </ul>
      <div style={s.dayActions}>
        <button style={s.dayActionBtn} onClick={onLog}>Log this session</button>
        {onStartTimer && <button style={s.dayActionBtnAlt} onClick={onStartTimer}>Start timer</button>}
      </div>
    </div>
  );
}

// ── LOG TAB ──────────────────────────────────────────────────────
function LogTab({ sessions, deleteSession }) {
  const [expanded, setExpanded] = useState({});
  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const today = todayKey();
  const todaySessions = sessions.filter(s => s.date === today);
  const pastDates = [...new Set(sessions.filter(s => s.date !== today).map(s => s.date))].sort((a,b) => a < b ? 1 : -1);

  if (sessions.length === 0) return (
    <div style={s.empty}>No sessions logged yet. Open the Program tab, pick a day and tap "Log this session".</div>
  );

  const SessionCard = ({ session }) => {
    const isExp = expanded[session.id];
    return (
      <div style={s.sessionCard}>
        <div style={s.sessionCardHeader} onClick={() => toggle(session.id)}>
          <div>
            <div style={s.sessionCardTitle}>{session.dayLabel}</div>
            <div style={s.sessionCardMeta}>
              <span style={s.sportTag}>{session.sport === "rugby" ? "🏉 Sevens" : "🎾 Tennis"}</span>
              <span style={s.phaseTag}>{session.phase}</span>
              {session.rpe && <span style={s.rpeTag}>RPE {session.rpe}</span>}
            </div>
          </div>
          <span style={s.expandChevron}>{isExp ? "▲" : "▼"}</span>
        </div>

        {isExp && (
          <div style={s.sessionCardBody}>
            {session.exercises.map((ex, ei) => (
              <div key={ei} style={s.logExBlock}>
                <div style={s.logExName}>{ex.name} <span style={s.logExPlanned}>({ex.planned} planned)</span></div>
                <div style={s.logSetsGrid}>
                  <div style={s.logSetsHeader}>
                    <span>Set</span><span>Reps</span><span>Weight</span><span>Time</span><span>✓</span>
                  </div>
                  {ex.sets.map((st, si) => (
                    <div key={si} style={{ ...s.logSetRow, ...(st.done ? s.logSetDone : {}) }}>
                      <span style={s.setNum}>{si + 1}</span>
                      <span style={s.logCell}>{st.reps || "—"}</span>
                      <span style={s.logCell}>{st.weight ? `${st.weight} ${st.unit}` : "—"}</span>
                      <span style={s.logCell}>{st.time || "—"}</span>
                      <span style={s.logCell}>{st.done ? "✓" : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {session.notes && (
              <div style={s.sessionNotes}>
                <span style={s.sessionNotesLabel}>Notes: </span>{session.notes}
              </div>
            )}
            <button style={s.deleteBtn} onClick={() => deleteSession(session.id)}>Delete session</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {todaySessions.length > 0 && (
        <div>
          <h2 style={s.sectionLabel}>Today — {todaySessions.length} session{todaySessions.length > 1 ? "s" : ""}</h2>
          {todaySessions.map(s2 => <SessionCard key={s2.id} session={s2} />)}
        </div>
      )}
      {pastDates.map(date => (
        <div key={date} style={{ marginTop: 24 }}>
          <h2 style={s.sectionLabel}>{prettyDate(date)}</h2>
          {sessions.filter(s2 => s2.date === date).map(s2 => <SessionCard key={s2.id} session={s2} />)}
        </div>
      ))}
    </div>
  );
}

// ── TIMER TAB ────────────────────────────────────────────────────
function TimerTab({ pendingPreset, onConsumePreset, sport }) {
  const [workSec, setWorkSec] = useState(45);
  const [restSec, setRestSec] = useState(15);
  const [rounds, setRounds]   = useState(8);
  const [running, setRunning] = useState(false);
  const [phase, setPhase]     = useState("work");
  const [round, setRound]     = useState(1);
  const [remaining, setRemaining] = useState(workSec);
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
  const presets = PRESETS.filter(p => p.tag === "both" || p.tag === sport);

  return (
    <div>
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
          <div style={s.ringCenter}><div style={s.clockText}>{done ? "🏁" : fmtClock(remaining)}</div></div>
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
          {presets.map(p => (
            <button key={p.name} disabled={running} style={{ ...s.presetBtn, opacity: running ? .5 : 1 }}
              onClick={() => { setWorkSec(p.work); setRestSec(p.rest); setRounds(p.rounds); }}>
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

// ── NUTRITION TAB ─────────────────────────────────────────────────
function NutritionTab({ sport }) {
  const tips = sport === "rugby" ? NUTRITION.rugby : NUTRITION.tennis;
  return (
    <div>
      <section style={s.card}><h2 style={s.cardTitle}>Pre-Workout</h2><p style={s.bodyText}>{NUTRITION.preIntro}</p><ul style={s.tipList}>{NUTRITION.pre.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>Recovery</h2><p style={s.bodyText}>{NUTRITION.recoveryIntro}</p><ul style={s.tipList}>{NUTRITION.recovery.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>{sport==="rugby"?"Rugby Sevens Notes":"Tennis Notes"}</h2><ul style={s.tipList}>{tips.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <p style={s.disclaimer}>General guidance only — not individualized medical or dietetic advice.</p>
    </div>
  );
}

// ── STRETCH TAB ───────────────────────────────────────────────────
function StretchTab({ sport }) {
  const wu = sport==="rugby" ? STRETCH.rugbyWarmup : STRETCH.tennisWarmup;
  const cd = sport==="rugby" ? STRETCH.rugbyCooldown : STRETCH.tennisCooldown;
  const ex = sport==="rugby" ? STRETCH.rugbyExtra : STRETCH.tennisExtra;
  return (
    <div>
      <section style={s.card}><h2 style={s.cardTitle}>Warm Up</h2><p style={s.bodyText}>10–12 minutes before any session.</p><ul style={s.tipList}>{wu.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>Dynamic Stretching</h2><ul style={s.tipList}>{STRETCH.dynamic.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>Cool Down</h2><ul style={s.tipList}>{cd.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>Static Stretching</h2><ul style={s.tipList}>{STRETCH.static.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>{sport==="rugby"?"Rugby Focus Areas":"Tennis Focus Areas"}</h2><ul style={s.tipList}>{ex.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
    </div>
  );
}

// ── HYDRATION TAB ─────────────────────────────────────────────────
function HydrationTab() {
  return (
    <div>
      <section style={s.card}><h2 style={s.cardTitle}>Daily Baseline</h2><ul style={s.tipList}>{HYDRATION.baseline.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>Around Training</h2><ul style={s.tipList}>{HYDRATION.training.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
      <section style={s.card}><h2 style={s.cardTitle}>Signs You're Behind</h2><ul style={s.tipList}>{HYDRATION.signs.map((t,i)=><li key={i} style={s.tipItem}>{t}</li>)}</ul></section>
    </div>
  );
}

// ── CONTENT ───────────────────────────────────────────────────────
const PRESETS = [
  { name:"Repeat Sprint", work:6,  rest:24, rounds:10, tag:"rugby"  },
  { name:"Game Sim (7s)", work:30, rest:25, rounds:12, tag:"rugby"  },
  { name:"Tennis Point Sim", work:8, rest:20, rounds:12, tag:"tennis" },
  { name:"Tennis Rally",  work:25, rest:15, rounds:10, tag:"tennis" },
  { name:"Tabata",   work:20, rest:10, rounds:8,  tag:"both" },
  { name:"HIIT Classic", work:40, rest:20, rounds:10, tag:"both" },
];

const NUTRITION = {
  preIntro:"Aim to fuel 2–3 hours before a session, with a smaller top-up 30–45 minutes out if needed.",
  pre:["2–3 hrs before: balanced meal with carbs + moderate protein (e.g. rice + chicken, oats + banana)","30–45 min before: small carb snack — banana, toast with honey, dates","Avoid large high-fat or high-fibre meals right before training","Sip water steadily in the lead-up","Caffeine 30–60 min before can sharpen focus — know your tolerance"],
  recoveryIntro:"Consistent daily intake matters more than perfect post-workout timing.",
  recovery:["Pair carbs + protein post-session (e.g. chocolate milk, yogurt + fruit, rice + eggs)","Include protein at each meal across the day","Colorful veg and fruit for micronutrients and antioxidants","Don't skip carbs — they refill the energy stores you just depleted","Sleep is your best recovery tool"],
  rugby:["Repeat-sprint and contact work is glycogen-hungry — don't under-fuel carbs on Build days","Protein needs are higher on contact-heavy days","Iron-rich foods (red meat, spinach, lentils) support oxygen-carrying capacity"],
  tennis:["Practice your on-court snack routine in training, not just match day","Bananas, dried fruit, sports drink work well for changeovers","On match days, eat a familiar pre-match meal — not the time to experiment"],
};

const STRETCH = {
  dynamic:["Leg swings (front-back and side-side) — 10 each leg","Walking lunges with rotation — 8 each side","High knees and butt kicks — 20m each","Arm circles and crossovers — 10 each direction","Inchworms to hamstring stretch — 5 reps"],
  static:["Hamstring stretch — 30 sec each leg","Quad stretch — 30 sec each leg","Hip flexor lunge stretch — 30 sec each side","Calf stretch — 30 sec each leg","Chest and shoulder doorway stretch — 30 sec","Glute stretch (figure-four) — 30 sec each side"],
  rugbyWarmup:["2 min easy jog","Lateral shuffles and backpedal — 2 × 20m each","Glute bridge holds — 2 × 10 reps","Band walks (mini-band around ankles) — 2 × 10 each direction","Dynamic hip flexor mobilization — 8 each side","Explosive step-ups — 2 × 6 each leg"],
  rugbyCooldown:["3–4 min walk or easy jog","Foam roll quads, IT band, and calves — 60 sec each","Seated hamstring stretch — 30 sec each leg","Lying hip flexor and glute stretch — 30 sec each side","Upper trap and neck side stretch — 20 sec each side","Slow diaphragmatic breathing — 2 min lying flat"],
  tennisWarmup:["2–3 min skipping or easy jog","Lateral shuffles — 3 × 10m each direction","Shoulder circles and cross-body arm swings — 15 each direction","Thoracic rotation drills — 8 each side","Split-step into directional sprint — 6 reps","Shadow swings — 10 forehand, 10 backhand"],
  tennisCooldown:["3–4 min easy walking or slow rally at the net","Wrist and forearm stretch — 20 sec each direction","Shoulder cross-body stretch and doorway opener — 30 sec each","Seated spinal rotation — 30 sec each side","Standing quad and hip flexor stretch — 30 sec each leg","Light spinal decompression (hang from doorframe) — 30–60 sec"],
  rugbyExtra:["Extra attention to hip flexors and groin","Thoracic spine rotation stretch — supports contact and passing","Neck and upper trap stretch after contact-heavy sessions"],
  tennisExtra:["Shoulder and rotator cuff mobility work","Wrist and forearm stretches — flexion and extension, 20 sec each","Thoracic rotation both directions — supports trunk rotation"],
};

const HYDRATION = {
  baseline:["Sip water consistently through the day","Urine should run pale yellow most of the day","Increase intake on hot, humid, or high-load training days"],
  training:["Start sessions already well hydrated","For sessions over 60 min, have water accessible throughout","Rehydrate steadily over the hours after hard sessions","Electrolyte drinks help on long, hot, high-sweat sessions"],
  signs:["Dark yellow urine or reduced urination","Unusual fatigue, headache, or dizziness during training","Cramping, especially late in a session","Noticeable drop in output or focus compared to normal"],
};

function makeYear(sportLabel, blocks) {
  const macrocycles = [];
  let wk = 1;
  for (let i = 0; i < 4; i++) {
    const build = blocks.build[i % blocks.build.length];
    const taper = blocks.taper[i % blocks.taper.length];
    const bSpan = `Weeks ${wk}–${wk+build.weeksLen-1}`; wk += build.weeksLen;
    const tSpan = `Weeks ${wk}–${wk+taper.weeksLen-1}`; wk += taper.weeksLen;
    macrocycles.push({
      id: `cycle${i+1}`, name: `Macrocycle ${i+1}`,
      span: `Weeks ${wk-build.weeksLen-taper.weeksLen}–${wk-1}`,
      blocks: [
        { id:`build${i+1}`, name:`Build — ${build.name}`, span:bSpan, blurb:build.blurb, days:build.days.map(d=>({...d,id:`${d.id}-c${i+1}`})) },
        { id:`taper${i+1}`, name:`Taper — ${taper.name}`, span:tSpan, blurb:taper.blurb, days:taper.days.map(d=>({...d,id:`${d.id}-c${i+1}`})) },
      ],
    });
  }
  return { intro:`${sportLabel} — full year, four Build/Taper macrocycles. Tap a day to see the exercises, then log your actual sets, reps and weights.`, macrocycles };
}

const RUGBY_PROGRAM = makeYear("Rugby Sevens", {
  build:[
    { name:"Strength & Power Base", weeksLen:8, blurb:"Heavier strength work and foundational power, moderate conditioning volume.",
      days:[
        { id:"ru-b1-a", label:"Day A — Strength", exercises:[{name:"Back Squat",sets:"4",reps:"6"},{name:"Bench Press",sets:"4",reps:"6"},{name:"Romanian Deadlift",sets:"3",reps:"8"},{name:"Pallof Press",sets:"3",reps:"10/side"}]},
        { id:"ru-b1-b", label:"Day B — Aerobic Base", exercises:[{name:"Steady-state run (65–75% effort)",sets:"1",reps:"25 min"},{name:"Mobility flow",sets:"1",reps:"10 min"}]},
        { id:"ru-b1-c", label:"Day C — Power", exercises:[{name:"Box Jump",sets:"3",reps:"5"},{name:"Trap Bar Deadlift",sets:"4",reps:"5"},{name:"Broad Jump",sets:"3",reps:"5"}]},
      ]},
    { name:"Repeat Sprint & Contact", weeksLen:8, blurb:"Shift toward repeat-sprint ability, game-speed conditioning, and contact prep.",
      days:[
        { id:"ru-b2-a", label:"Day A — Power & Strength", exercises:[{name:"Hang Clean",sets:"5",reps:"3"},{name:"Jump Squat",sets:"4",reps:"4"},{name:"Back Squat (heavy)",sets:"3",reps:"4"}]},
        { id:"ru-b2-b", label:"Day B — Repeat Sprint", exercises:[{name:"Sprint 40m",sets:"6",reps:"1"},{name:"Acceleration drills",sets:"4",reps:"1"}], timerPreset:"Repeat Sprint"},
        { id:"ru-b2-c", label:"Day C — Game Sim + Contact", exercises:[{name:"Game-sim conditioning",sets:"1",reps:"see timer"},{name:"Tackle bag drills",sets:"4",reps:"6"}], timerPreset:"Game Sim (7s)"},
      ]},
  ],
  taper:[
    { name:"Sharpen", weeksLen:2, blurb:"Cut volume sharply, keep intensity brief and sharp, protect recovery.",
      days:[
        { id:"ru-t1-a", label:"Day A — Sharpen", exercises:[{name:"Sprint 30m (max effort, full recovery)",sets:"4",reps:"1"},{name:"Light power cleans",sets:"3",reps:"3"}]},
        { id:"ru-t1-b", label:"Day B — Light Technical", exercises:[{name:"Ball skills / passing",sets:"1",reps:"15 min"},{name:"Easy aerobic jog",sets:"1",reps:"15 min"}]},
      ]},
  ],
});

const TENNIS_PROGRAM = makeYear("Tennis", {
  build:[
    { name:"Strength & Movement Base", weeksLen:8, blurb:"General strength, rotational power foundation, and footwork patterning.",
      days:[
        { id:"te-b1-a", label:"Day A — Strength", exercises:[{name:"Goblet Squat",sets:"4",reps:"8"},{name:"Single-Arm Row",sets:"3",reps:"10/side"},{name:"Romanian Deadlift",sets:"3",reps:"8"},{name:"Pallof Press",sets:"3",reps:"10/side"}]},
        { id:"te-b1-b", label:"Day B — Footwork & Aerobic Base", exercises:[{name:"Ladder footwork drills",sets:"4",reps:"30 sec"},{name:"Steady-state run/bike",sets:"1",reps:"25 min"}]},
        { id:"te-b1-c", label:"Day C — Rotational Power", exercises:[{name:"Medicine Ball Rotational Throw",sets:"4",reps:"6/side"},{name:"Cable Woodchop",sets:"3",reps:"10/side"},{name:"Split Squat",sets:"3",reps:"8/leg"}]},
      ]},
    { name:"Court Speed & Match Endurance", weeksLen:8, blurb:"Build toward match-realistic movement, rally endurance, and shoulder durability.",
      days:[
        { id:"te-b2-a", label:"Day A — Power & Strength", exercises:[{name:"Trap Bar Jump",sets:"4",reps:"4"},{name:"Bulgarian Split Squat",sets:"3",reps:"8/leg"},{name:"Med Ball Overhead Slam",sets:"3",reps:"6"}]},
        { id:"te-b2-b", label:"Day B — Point Simulation", exercises:[{name:"Lateral shuffle reps",sets:"8",reps:"10 sec"},{name:"Recovery sprints",sets:"6",reps:"1"}], timerPreset:"Tennis Point Sim"},
        { id:"te-b2-c", label:"Day C — Rally Endurance + Shoulder Care", exercises:[{name:"On-court rally conditioning",sets:"1",reps:"see timer"},{name:"Rotator cuff band series",sets:"3",reps:"12/side"}], timerPreset:"Tennis Rally"},
      ]},
  ],
  taper:[
    { name:"Sharpen", weeksLen:2, blurb:"Reduce volume, keep serve and movement sharp, protect the shoulder.",
      days:[
        { id:"te-t1-a", label:"Day A — Sharpen", exercises:[{name:"Serve speed reps (low volume, full recovery)",sets:"3",reps:"6"},{name:"Light med ball throws",sets:"3",reps:"5"}]},
        { id:"te-t1-b", label:"Day B — Light Technical", exercises:[{name:"Groundstroke rally — easy pace",sets:"1",reps:"15 min"},{name:"Footwork patterning (light)",sets:"1",reps:"10 min"}]},
      ]},
  ],
});

// ── DESIGN TOKENS ─────────────────────────────────────────────────
const colors = {
  mat:"#2E2C29", matDeep:"#262420", paper:"#F2EFE9", paperDim:"#C9C3B6",
  amber:"#E8B33D", sage:"#8C9A88", coral:"#D1603D", line:"rgba(242,239,233,0.14)", ink:"#211F1C",
};

const s = {
  app:{minHeight:"100vh",background:colors.mat,color:colors.paper,fontFamily:"'Inter',sans-serif",paddingBottom:48},
  header:{position:"sticky",top:0,zIndex:5,background:colors.matDeep,borderBottom:`1px solid ${colors.line}`,paddingTop:18},
  headerInner:{display:"flex",alignItems:"baseline",justifyContent:"space-between",padding:"0 20px"},
  wordmark:{fontFamily:"'Bebas Neue','Inter',sans-serif",fontSize:32,letterSpacing:"0.08em",margin:0,color:colors.paper},
  dateChip:{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:colors.amber,letterSpacing:"0.04em"},
  sportSwitch:{display:"flex",gap:8,padding:"12px 20px 0"},
  sportBtn:{flex:1,background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:20,color:colors.paperDim,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:"0.04em",padding:"8px 0",cursor:"pointer"},
  sportBtnActive:{background:colors.amber,color:colors.ink,border:`1px solid ${colors.amber}`},
  tabs:{display:"flex",gap:0,marginTop:12,padding:"0 12px",overflowX:"auto"},
  tabBtn:{flex:"1 0 auto",padding:"12px 8px",background:"transparent",border:"none",borderBottom:`3px solid transparent`,color:colors.paperDim,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:"0.04em",cursor:"pointer",whiteSpace:"nowrap"},
  tabBtnActive:{color:colors.paper,borderBottom:`3px solid ${colors.amber}`},
  main:{maxWidth:480,margin:"0 auto",padding:"20px 16px 0"},
  card:{background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,padding:18,marginBottom:22},
  cardTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:"0.05em",margin:"0 0 14px",color:colors.paper},
  bodyText:{fontSize:13.5,color:colors.paperDim,lineHeight:1.5,margin:"0 0 12px"},
  tipList:{margin:0,paddingLeft:18},
  tipItem:{fontSize:13.5,color:colors.paper,lineHeight:1.6,marginBottom:6},
  disclaimer:{fontSize:11.5,color:colors.paperDim,fontStyle:"italic",lineHeight:1.5},
  input:{width:"100%",background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paper,fontFamily:"'JetBrains Mono',monospace",fontSize:15,padding:"10px 12px",marginBottom:12,boxSizing:"border-box"},
  row3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10},
  smallInputWrap:{display:"flex",flexDirection:"column"},
  miniLabel:{fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",color:colors.paperDim,marginBottom:6},
  primaryBtn:{width:"100%",background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:"0.05em",padding:"13px 0",cursor:"pointer"},
  secondaryBtn:{flex:1,background:colors.coral,color:colors.paper,border:"none",borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:"0.05em",padding:"13px 0",cursor:"pointer"},
  ghostBtn:{flex:1,background:"transparent",color:colors.paperDim,border:`1px solid ${colors.line}`,borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:"0.05em",padding:"13px 0",cursor:"pointer"},
  sectionLabel:{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.06em",color:colors.paperDim,margin:"0 0 12px"},
  empty:{color:colors.paperDim,fontSize:14,border:`1px dashed ${colors.line}`,borderRadius:4,padding:"24px 18px"},
  // PROGRAM
  programIntro:{fontSize:13,color:colors.paperDim,lineHeight:1.5,marginBottom:18},
  cycleBlock:{border:`1px solid ${colors.line}`,borderRadius:4,marginBottom:14,overflow:"hidden"},
  cycleHeader:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:colors.matDeep,border:"none",padding:"14px 16px",cursor:"pointer",textAlign:"left"},
  cycleName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:"0.05em",color:colors.amber},
  cycleSpan:{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:colors.sage,marginTop:2},
  cycleBody:{padding:"0 10px 10px"},
  phaseBlock:{border:`1px solid ${colors.line}`,borderRadius:4,marginTop:10,overflow:"hidden"},
  phaseHeader:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:colors.mat,border:"none",padding:"12px 14px",cursor:"pointer",textAlign:"left"},
  phaseName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.04em",color:colors.paper},
  phaseSpan:{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:colors.sage,marginTop:2},
  phaseRight:{display:"flex",alignItems:"center",gap:10,color:colors.paperDim},
  phaseProgress:{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:colors.amber},
  phaseBody:{padding:"0 12px 12px"},
  phaseBlurb:{fontSize:13,color:colors.paperDim,lineHeight:1.5,margin:"10px 0 14px"},
  dayCard:{background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,padding:14,marginBottom:10},
  dayHeader:{display:"flex",alignItems:"center",gap:10,marginBottom:10},
  checkbox:{width:22,height:22,flexShrink:0,borderRadius:"50%",border:`1px solid ${colors.paperDim}`,background:"transparent",color:colors.ink,fontSize:13,lineHeight:"20px",cursor:"pointer",padding:0},
  checkboxDone:{background:colors.sage,border:`1px solid ${colors.sage}`,color:colors.ink},
  dayLabel:{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.03em",color:colors.paper},
  dayLabelDone:{color:colors.sage},
  exList:{listStyle:"none",margin:0,padding:0},
  exItem:{display:"flex",justifyContent:"space-between",fontSize:13.5,padding:"5px 0",borderBottom:`1px solid ${colors.line}`},
  exSetsReps:{fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,color:colors.amber},
  dayActions:{display:"flex",gap:8,marginTop:12},
  dayActionBtn:{flex:1,background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:"0.04em",padding:"9px 0",cursor:"pointer"},
  dayActionBtnAlt:{flex:1,background:"transparent",color:colors.paper,border:`1px solid ${colors.paperDim}`,borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:"0.04em",padding:"9px 0",cursor:"pointer"},
  // MODAL
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modal:{background:colors.matDeep,borderRadius:"12px 12px 0 0",width:"100%",maxWidth:500,maxHeight:"92vh",display:"flex",flexDirection:"column"},
  modalHeader:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"18px 18px 14px",borderBottom:`1px solid ${colors.line}`},
  modalTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:"0.05em",color:colors.paper},
  modalSub:{fontSize:12,color:colors.sage,marginTop:3,fontFamily:"'JetBrains Mono',monospace"},
  closeBtn:{background:"transparent",border:`1px solid ${colors.line}`,borderRadius:"50%",color:colors.paperDim,width:30,height:30,cursor:"pointer",fontSize:13,flexShrink:0},
  modalBody:{flex:1,overflowY:"auto",padding:"0 18px 8px"},
  modalFooter:{display:"flex",gap:10,padding:"14px 18px 24px",borderTop:`1px solid ${colors.line}`},
  cancelBtn:{flex:1,background:"transparent",color:colors.paperDim,border:`1px solid ${colors.line}`,borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.04em",padding:"11px 0",cursor:"pointer"},
  saveBtn:{flex:2,background:colors.amber,color:colors.ink,border:"none",borderRadius:3,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.04em",padding:"11px 0",cursor:"pointer"},
  exBlock:{paddingBottom:18,marginBottom:18,borderBottom:`1px solid ${colors.line}`},
  exBlockHeader:{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"14px 0 10px"},
  exBlockName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.04em",color:colors.paper},
  exBlockPlanned:{fontSize:11,color:colors.sage,fontFamily:"'JetBrains Mono',monospace"},
  setGrid:{display:"flex",flexDirection:"column",gap:4},
  setGridHeader:{display:"grid",gridTemplateColumns:"30px 1fr 1fr 1fr 38px 28px",gap:6,padding:"0 0 4px",borderBottom:`1px solid ${colors.line}`},
  setRow:{display:"grid",gridTemplateColumns:"30px 1fr 1fr 1fr 38px 28px",gap:6,alignItems:"center",padding:"3px 0"},
  setRowDone:{opacity:0.5},
  setNum:{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:colors.sage,textAlign:"center"},
  setInput:{background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paper,fontFamily:"'JetBrains Mono',monospace",fontSize:13,padding:"7px 8px",width:"100%"},
  unitSel:{background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paperDim,fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"4px 2px",width:"100%"},
  doneBtn:{background:"transparent",border:`1px solid ${colors.line}`,borderRadius:"50%",color:colors.paperDim,width:28,height:28,cursor:"pointer",fontSize:12,padding:0},
  doneBtnActive:{background:colors.sage,border:`1px solid ${colors.sage}`,color:colors.ink},
  removeSetBtn:{background:"transparent",border:"none",color:colors.paperDim,cursor:"pointer",fontSize:13,padding:0},
  addSetBtn:{marginTop:10,background:"transparent",border:`1px dashed ${colors.line}`,borderRadius:3,color:colors.sage,fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"6px 0",width:"100%",cursor:"pointer"},
  sessionMeta:{paddingTop:4},
  metaField:{marginBottom:12},
  metaLabel:{fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",color:colors.paperDim,display:"block",marginBottom:6},
  notesInput:{width:"100%",background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,color:colors.paper,fontFamily:"'Inter',sans-serif",fontSize:13,padding:"10px 12px",resize:"vertical",boxSizing:"border-box"},
  // LOG TAB SESSION CARDS
  sessionCard:{background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,marginBottom:12,overflow:"hidden"},
  sessionCardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",cursor:"pointer"},
  sessionCardTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.04em",color:colors.paper},
  sessionCardMeta:{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"},
  sportTag:{fontSize:11,background:"rgba(232,179,61,0.15)",color:colors.amber,padding:"2px 7px",borderRadius:10,fontFamily:"'JetBrains Mono',monospace"},
  phaseTag:{fontSize:11,background:"rgba(140,154,136,0.2)",color:colors.sage,padding:"2px 7px",borderRadius:10,fontFamily:"'JetBrains Mono',monospace"},
  rpeTag:{fontSize:11,background:"rgba(209,96,61,0.2)",color:colors.coral,padding:"2px 7px",borderRadius:10,fontFamily:"'JetBrains Mono',monospace"},
  expandChevron:{color:colors.paperDim,fontSize:13},
  sessionCardBody:{padding:"0 16px 16px",borderTop:`1px solid ${colors.line}`},
  logExBlock:{paddingTop:14,marginBottom:4},
  logExName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:"0.03em",color:colors.paper,marginBottom:8},
  logExPlanned:{fontSize:11,color:colors.sage,fontFamily:"'JetBrains Mono',monospace",fontWeight:"normal"},
  logSetsGrid:{display:"flex",flexDirection:"column",gap:3},
  logSetsHeader:{display:"grid",gridTemplateColumns:"30px 1fr 1.2fr 1fr 28px",gap:6,fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",color:colors.paperDim,padding:"0 0 4px",borderBottom:`1px solid ${colors.line}`},
  logSetRow:{display:"grid",gridTemplateColumns:"30px 1fr 1.2fr 1fr 28px",gap:6,padding:"5px 0",borderBottom:`1px solid ${colors.line}`},
  logSetDone:{background:"rgba(140,154,136,0.08)"},
  logCell:{fontSize:12.5,fontFamily:"'JetBrains Mono',monospace",color:colors.paper},
  sessionNotes:{marginTop:12,fontSize:13,color:colors.paperDim,fontStyle:"italic",lineHeight:1.5},
  sessionNotesLabel:{color:colors.amber,fontStyle:"normal",fontWeight:600},
  deleteBtn:{marginTop:12,background:"transparent",border:`1px solid rgba(209,96,61,0.3)`,borderRadius:3,color:colors.coral,fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"6px 12px",cursor:"pointer"},
  // TIMER
  timerCard:{background:colors.matDeep,border:`1px solid ${colors.line}`,borderRadius:4,padding:22,marginBottom:22,display:"flex",flexDirection:"column",alignItems:"center"},
  timerStatusRow:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  phasePill:{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:"0.08em",textTransform:"uppercase",padding:"4px 10px",borderRadius:20},
  roundText:{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:colors.paperDim},
  ringWrap:{position:"relative",width:220,height:220,margin:"10px 0 18px"},
  ringCenter:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},
  clockText:{fontFamily:"'JetBrains Mono',monospace",fontSize:44,color:colors.paper,fontWeight:700},
  timerButtons:{display:"flex",gap:10,width:"100%"},
  lockNote:{marginTop:4,fontSize:12,color:colors.paperDim,fontStyle:"italic"},
  presetGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
  presetBtn:{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4,background:colors.mat,border:`1px solid ${colors.line}`,borderRadius:3,padding:"10px 12px",cursor:"pointer",textAlign:"left"},
  presetName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:"0.03em",color:colors.paper},
  presetDetail:{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:colors.amber},
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;}
input:focus,select:focus,textarea:focus,button:focus-visible{outline:2px solid ${colors.amber};outline-offset:1px;}
button{transition:opacity 0.15s ease;}
button:hover{opacity:0.88;}
::placeholder{color:${colors.paperDim};opacity:0.6;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${colors.line};border-radius:2px;}
`;
