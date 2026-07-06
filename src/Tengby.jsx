import React, { useState, useEffect, useRef, useCallback } from "react";

// ---------- storage helpers ----------
const STORE_ENTRIES = "tengby:entries";
const STORE_PROGRESS = "tengby:program-progress";
const STORE_SPORT = "tengby:sport";

const loadLocal = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};
const saveLocal = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
};

// ---------- helpers ----------
const todayKey = () => new Date().toISOString().slice(0, 10);
const prettyDate = (key) => {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
const pad2 = (n) => String(n).padStart(2, "0");
const fmtClock = (s) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- main ----------
export default function Tengby() {
  const [tab, setTab] = useState("program");
  const [sport, setSport] = useState(() => loadLocal(STORE_SPORT, "rugby"));
  const [entries, setEntries] = useState(() => loadLocal(STORE_ENTRIES, []));
  const [progress, setProgress] = useState(() => loadLocal(STORE_PROGRESS, {}));
  const [pendingPreset, setPendingPreset] = useState(null);
  const [lastLoggedDay, setLastLoggedDay] = useState(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => { setSaveError(!saveLocal(STORE_ENTRIES, entries)); }, [entries]);
  useEffect(() => { saveLocal(STORE_PROGRESS, progress); }, [progress]);
  useEffect(() => { saveLocal(STORE_SPORT, sport); }, [sport]);

  const addManyEntries = (exercises, dayId) => {
    const now = Date.now();
    const today = todayKey();
    const newEntries = exercises.map((ex, i) => ({
      id: uid(), date: today, name: ex.name, sets: ex.sets, reps: ex.reps,
      weight: "", unit: "lb", ts: now - i,
    }));
    setEntries((prev) => [...newEntries, ...prev]);
    setLastLoggedDay(dayId);
    setTimeout(() => setLastLoggedDay(null), 2200);
  };

  const toggleDayComplete = (dayId) => setProgress((p) => ({ ...p, [dayId]: !p[dayId] }));
  const removeEntry = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const today = todayKey();
  const todaysEntries = entries.filter((e) => e.date === today);
  const historyDates = Array.from(new Set(entries.filter((e) => e.date !== today).map((e) => e.date))).sort((a, b) => (a < b ? 1 : -1));

  const program = sport === "rugby" ? RUGBY_PROGRAM : TENNIS_PROGRAM;

  return (
    <div style={styles.app}>
      <style>{css}</style>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.wordmark}>TENGBY</h1>
          <span style={styles.dateChip}>{prettyDate(today)}</span>
        </div>

        <div style={styles.sportSwitch}>
          {[{ id: "rugby", label: "Rugby Sevens" }, { id: "tennis", label: "Tennis" }].map((s) => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              style={{ ...styles.sportBtn, ...(sport === s.id ? styles.sportBtnActive : {}) }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <nav style={styles.tabs}>
          {[
            ["program", "Program"],
            ["log", "Log"],
            ["timer", "Timer"],
            ["nutrition", "Nutrition"],
            ["stretch", "Stretch"],
            ["hydration", "Hydrate"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ ...styles.tabBtn, ...(tab === id ? styles.tabBtnActive : {}) }}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={styles.main}>
        {tab === "program" && (
          <ProgramTab
            program={program}
            progress={progress}
            toggleDayComplete={toggleDayComplete}
            addManyEntries={addManyEntries}
            lastLoggedDay={lastLoggedDay}
            onStartTimer={(preset) => { setPendingPreset(preset); setTab("timer"); }}
          />
        )}
        {tab === "log" && (
          <LogTab
            todaysEntries={todaysEntries}
            historyDates={historyDates}
            entries={entries}
            removeEntry={removeEntry}
            addManyEntries={addManyEntries}
          />
        )}
        {tab === "timer" && <TimerTab pendingPreset={pendingPreset} onConsumePreset={() => setPendingPreset(null)} sport={sport} />}
        {tab === "nutrition" && <NutritionTab sport={sport} />}
        {tab === "stretch" && <StretchTab sport={sport} />}
        {tab === "hydration" && <HydrationTab />}
      </main>

      {saveError && <div style={styles.saveError}>Couldn't save — changes may not persist on this device.</div>}
    </div>
  );
}

// ---------- Program tab (1-year periodized) ----------
function ProgramTab({ program, progress, toggleDayComplete, addManyEntries, lastLoggedDay, onStartTimer }) {
  const [openCycle, setOpenCycle] = useState(program.macrocycles[0].id);
  const [openBlock, setOpenBlock] = useState(null);

  return (
    <div>
      <div style={styles.programIntro}>{program.intro}</div>

      {program.macrocycles.map((cycle) => {
        const isOpen = openCycle === cycle.id;
        const allDays = cycle.blocks.flatMap((b) => b.days);
        const completedCount = allDays.filter((d) => progress[d.id]).length;

        return (
          <div key={cycle.id} style={styles.cycleBlock}>
            <button style={styles.cycleHeader} onClick={() => setOpenCycle(isOpen ? null : cycle.id)}>
              <div>
                <div style={styles.cycleName}>{cycle.name}</div>
                <div style={styles.cycleSpan}>{cycle.span}</div>
              </div>
              <div style={styles.phaseRight}>
                <span style={styles.phaseProgress}>{completedCount}/{allDays.length}</span>
                <span>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div style={styles.cycleBody}>
                {cycle.blocks.map((block) => {
                  const blockKey = `${cycle.id}__${block.id}`;
                  const blockOpen = openBlock === blockKey;
                  return (
                    <div key={block.id} style={styles.phaseBlock}>
                      <button style={styles.phaseHeader} onClick={() => setOpenBlock(blockOpen ? null : blockKey)}>
                        <div>
                          <div style={styles.phaseName}>{block.name}</div>
                          <div style={styles.phaseSpan}>{block.span}</div>
                        </div>
                        <span>{blockOpen ? "▲" : "▼"}</span>
                      </button>
                      {blockOpen && (
                        <div style={styles.phaseBody}>
                          <p style={styles.phaseBlurb}>{block.blurb}</p>
                          {block.days.map((day) => (
                            <ProgramDay
                              key={day.id}
                              day={day}
                              complete={!!progress[day.id]}
                              justLogged={lastLoggedDay === day.id}
                              onToggleComplete={() => toggleDayComplete(day.id)}
                              onLog={() => addManyEntries(day.exercises, day.id)}
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

function ProgramDay({ day, complete, justLogged, onToggleComplete, onLog, onStartTimer }) {
  return (
    <div style={styles.dayCard}>
      <div style={styles.dayHeader}>
        <button style={{ ...styles.checkbox, ...(complete ? styles.checkboxDone : {}) }} onClick={onToggleComplete}>
          {complete ? "✓" : ""}
        </button>
        <span style={{ ...styles.dayLabel, ...(complete ? styles.dayLabelDone : {}) }}>{day.label}</span>
      </div>
      <ul style={styles.exList}>
        {day.exercises.map((ex, i) => (
          <li key={i} style={styles.exItem}>
            <span>{ex.name}</span>
            <span style={styles.exSetsReps}>{ex.sets} × {ex.reps}</span>
          </li>
        ))}
      </ul>
      <div style={styles.dayActions}>
        <button style={styles.dayActionBtn} onClick={onLog}>{justLogged ? "Logged ✓" : "Log this session"}</button>
        {onStartTimer && <button style={styles.dayActionBtnAlt} onClick={onStartTimer}>Start timer</button>}
      </div>
    </div>
  );
}

// ---------- Log tab ----------
function LogTab({ todaysEntries, historyDates, entries, removeEntry }) {
  const [openHistory, setOpenHistory] = useState(false);
  return (
    <div>
      <h2 style={styles.sectionLabel}>Today — {todaysEntries.length} logged</h2>
      {todaysEntries.length === 0 ? (
        <div style={styles.empty}>Nothing logged yet today. Log a session from the Program tab.</div>
      ) : (
        <div style={styles.ticketList}>
          {todaysEntries.map((e) => <Ticket key={e.id} entry={e} onRemove={() => removeEntry(e.id)} />)}
        </div>
      )}
      {historyDates.length > 0 && (
        <div style={styles.historyBlock}>
          <button style={styles.historyToggle} onClick={() => setOpenHistory((v) => !v)}>
            {openHistory ? "Hide" : "Show"} history ({historyDates.length} {historyDates.length === 1 ? "day" : "days"})
            <span style={{ marginLeft: 6 }}>{openHistory ? "▲" : "▼"}</span>
          </button>
          {openHistory && historyDates.map((date) => {
            const dayEntries = entries.filter((e) => e.date === date);
            return (
              <div key={date} style={{ marginTop: 18 }}>
                <h3 style={styles.historyDate}>{prettyDate(date)}</h3>
                <div style={styles.ticketList}>
                  {dayEntries.map((e) => <Ticket key={e.id} entry={e} onRemove={() => removeEntry(e.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ticket({ entry, onRemove }) {
  return (
    <div style={styles.ticket}>
      <div style={styles.ticketPunch} />
      <div style={styles.ticketBody}>
        <div style={styles.ticketName}>{entry.name}</div>
        <div style={styles.ticketMeta}>{entry.sets} × {entry.reps}{entry.weight ? ` @ ${entry.weight}${entry.unit}` : ""}</div>
      </div>
      <button style={styles.ticketRemove} onClick={onRemove}>✕</button>
    </div>
  );
}

// ---------- Timer tab ----------
function TimerTab({ pendingPreset, onConsumePreset, sport }) {
  const [workSec, setWorkSec] = useState(45);
  const [restSec, setRestSec] = useState(15);
  const [rounds, setRounds] = useState(8);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("work");
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(workSec);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!pendingPreset) return;
    const p = PRESETS.find((pr) => pr.name === pendingPreset);
    if (p) {
      setRunning(false); setPhase("work"); setRound(1);
      setWorkSec(p.work); setRestSec(p.rest); setRounds(p.rounds); setRemaining(p.work);
    }
    onConsumePreset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPreset]);

  useEffect(() => {
    if (!running) setRemaining(phase === "work" ? workSec : restSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workSec, restSec]);

  const reset = useCallback(() => {
    setRunning(false); setPhase("work"); setRound(1); setRemaining(workSec);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [workSec]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        setPhase((prevPhase) => {
          if (prevPhase === "work") return "rest";
          setRound((rd) => { const next = rd + 1; if (next > rounds) setRunning(false); return next; });
          return "work";
        });
        return 0;
      });
      return undefined;
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, rounds]);

  useEffect(() => {
    if (remaining === 0 && running) setRemaining(phase === "work" ? workSec : restSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const done = round > rounds;
  const ringColor = phase === "work" ? colors.amber : colors.coral;
  const total = phase === "work" ? workSec : restSec;
  const pct = Math.max(0, Math.min(1, remaining / Math.max(1, total)));
  const presets = sport === "rugby" ? PRESETS.filter((p) => p.tag !== "tennis") : PRESETS.filter((p) => p.tag !== "rugby");

  return (
    <div>
      <section style={styles.timerCard}>
        <div style={styles.timerStatusRow}>
          <span style={{ ...styles.phasePill, background: phase === "work" ? colors.amber : colors.coral, color: colors.ink }}>
            {done ? "complete" : phase}
          </span>
          <span style={styles.roundText}>Round {Math.min(round, rounds)} / {rounds}</span>
        </div>
        <div style={styles.ringWrap}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="98" fill="none" stroke={colors.line} strokeWidth="10" />
            <circle cx="110" cy="110" r="98" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 98} strokeDashoffset={2 * Math.PI * 98 * (1 - pct)}
              transform="rotate(-90 110 110)" style={{ transition: "stroke-dashoffset 0.95s linear" }} />
          </svg>
          <div style={styles.ringCenter}><div style={styles.clockText}>{done ? "🏁" : fmtClock(remaining)}</div></div>
        </div>
        <div style={styles.timerButtons}>
          {!running ? (
            <button style={styles.primaryBtn} onClick={() => { if (done) reset(); setRunning(true); }}>
              {round === 1 && phase === "work" && remaining === workSec ? "Start" : "Resume"}
            </button>
          ) : (
            <button style={styles.secondaryBtn} onClick={() => setRunning(false)}>Pause</button>
          )}
          <button style={styles.ghostBtn} onClick={reset}>Reset</button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Presets</h2>
        <div style={styles.presetGrid}>
          {presets.map((p) => (
            <button key={p.name} disabled={running} style={{ ...styles.presetBtn, opacity: running ? 0.5 : 1 }}
              onClick={() => { setWorkSec(p.work); setRestSec(p.rest); setRounds(p.rounds); }}>
              <span style={styles.presetName}>{p.name}</span>
              <span style={styles.presetDetail}>{p.work}s / {p.rest}s × {p.rounds}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Interval settings</h2>
        <div style={styles.row3}>
          <NumberField label="Work (sec)" value={workSec} onChange={setWorkSec} disabled={running} />
          <NumberField label="Rest (sec)" value={restSec} onChange={setRestSec} disabled={running} />
          <NumberField label="Rounds" value={rounds} onChange={setRounds} disabled={running} />
        </div>
        {running && <div style={styles.lockNote}>Pause to edit settings.</div>}
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, disabled }) {
  return (
    <div style={styles.smallInputWrap}>
      <label style={styles.miniLabel}>{label}</label>
      <input style={{ ...styles.input, opacity: disabled ? 0.5 : 1 }} inputMode="numeric" value={value} disabled={disabled}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); onChange(v === "" ? 0 : parseInt(v, 10)); }} />
    </div>
  );
}

// ---------- Nutrition tab ----------
function NutritionTab({ sport }) {
  const tips = sport === "rugby" ? NUTRITION.rugby : NUTRITION.tennis;
  return (
    <div>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Pre-Workout</h2>
        <p style={styles.bodyText}>{NUTRITION.preIntro}</p>
        <ul style={styles.tipList}>{NUTRITION.pre.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Recovery</h2>
        <p style={styles.bodyText}>{NUTRITION.recoveryIntro}</p>
        <ul style={styles.tipList}>{NUTRITION.recovery.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{sport === "rugby" ? "Rugby Sevens Notes" : "Tennis Notes"}</h2>
        <ul style={styles.tipList}>{tips.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <p style={styles.disclaimer}>General guidance only — not individualized medical or dietetic advice. For specific needs (allergies, medical conditions, performance targets), consult a registered dietitian or sports nutritionist.</p>
    </div>
  );
}

// ---------- Stretch tab ----------
function StretchTab({ sport }) {
  const extra = sport === "rugby" ? STRETCH.rugbyExtra : STRETCH.tennisExtra;
  const warmup = sport === "rugby" ? STRETCH.rugbyWarmup : STRETCH.tennisWarmup;
  const cooldown = sport === "rugby" ? STRETCH.rugbyCooldown : STRETCH.tennisCooldown;
  return (
    <div>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Warm Up</h2>
        <p style={styles.bodyText}>10–12 minutes before any session. Raise heart rate, activate key muscles, prep the nervous system for work.</p>
        <ul style={styles.tipList}>{warmup.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Dynamic Stretching — Within Warm Up</h2>
        <p style={styles.bodyText}>Movement-based stretches to increase range of motion without reducing power. Keep moving — no static holds here.</p>
        <ul style={styles.tipList}>{STRETCH.dynamic.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cool Down</h2>
        <p style={styles.bodyText}>8–10 minutes after every session. Gradually lower heart rate and begin the recovery process.</p>
        <ul style={styles.tipList}>{cooldown.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Static Stretching — Within Cool Down</h2>
        <p style={styles.bodyText}>Hold each position 20–30 seconds, breathing slowly. Best done while muscles are still warm post-session.</p>
        <ul style={styles.tipList}>{STRETCH.static.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{sport === "rugby" ? "Rugby Sevens Focus Areas" : "Tennis Focus Areas"}</h2>
        <ul style={styles.tipList}>{extra.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
    </div>
  );
}

// ---------- Hydration tab ----------
function HydrationTab() {
  return (
    <div>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Daily Baseline</h2>
        <ul style={styles.tipList}>{HYDRATION.baseline.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Around Training</h2>
        <ul style={styles.tipList}>{HYDRATION.training.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Signs You're Behind</h2>
        <ul style={styles.tipList}>{HYDRATION.signs.map((t, i) => <li key={i} style={styles.tipItem}>{t}</li>)}</ul>
      </section>
      <p style={styles.disclaimer}>General guidance only. Needs vary with body size, climate, sweat rate, and session intensity — adjust to your own situation.</p>
    </div>
  );
}

// ---------- content: timer presets ----------
const PRESETS = [
  { name: "Repeat Sprint", work: 6, rest: 24, rounds: 10, tag: "rugby" },
  { name: "Game Sim (7s)", work: 30, rest: 25, rounds: 12, tag: "rugby" },
  { name: "Tennis Point Sim", work: 8, rest: 20, rounds: 12, tag: "tennis" },
  { name: "Tennis Rally Endurance", work: 25, rest: 15, rounds: 10, tag: "tennis" },
  { name: "Tabata", work: 20, rest: 10, rounds: 8, tag: "both" },
  { name: "HIIT Classic", work: 40, rest: 20, rounds: 10, tag: "both" },
];

// ---------- content: nutrition ----------
const NUTRITION = {
  preIntro: "Aim to fuel 2–3 hours before a session, with a smaller top-up 30–45 minutes out if needed.",
  pre: [
    "2–3 hrs before: balanced meal with carbs + moderate protein, lower in fat and fibre (e.g. rice + chicken, oats + banana, pasta + lean protein)",
    "30–45 min before: small, easily digested carb snack if needed — banana, toast with honey, a few dates, a rice cake",
    "Avoid large, high-fat, or high-fibre meals right before training — they sit heavy and can cause GI discomfort during hard efforts",
    "Sip water steadily in the lead-up rather than chugging right before you start",
    "Caffeine (coffee, tea) 30–60 min before can sharpen focus and improve output — know your own tolerance and avoid it late in the day",
  ],
  recoveryIntro: "The 30–60 minutes after a hard session is a useful window for replenishing — but consistent daily intake across the whole day matters more than perfect timing.",
  recovery: [
    "Pair carbs + protein post-session to restock glycogen and support muscle repair (e.g. chocolate milk, yogurt + fruit, rice + eggs, a protein shake + banana)",
    "Include protein at each meal across the day — not just post-workout",
    "Colorful veg and fruit for micronutrients and antioxidant support — good for inflammation management across a long training year",
    "Don't skip carbs — they're what refill the energy stores you just depleted",
    "Sleep is your best recovery tool — eating well but sleeping poorly limits the gains from both training and nutrition",
    "On back-to-back training days, prioritize carb-heavy evening meals to top up stores overnight",
  ],
  rugby: [
    "Repeat-sprint and contact work is glycogen-hungry — don't under-fuel carbs on Build-phase days",
    "On double-session or game-sim days, a carb-focused snack between sessions helps maintain output quality in the second session",
    "Protein needs are higher on contact-heavy days — muscle tissue takes more damage and needs more raw material to rebuild",
    "Iron-rich foods (red meat, spinach, lentils) support oxygen-carrying capacity — relevant for a sport as demanding as sevens",
  ],
  tennis: [
    "Long matches mean steady fueling matters — practice your on-court snack and drink routine in training, not just on match day",
    "Easily portable carbs (bananas, dried fruit, sports drink, energy gels) work well for changeovers",
    "Shoulder and arm volume is high in tennis — adequate protein and sleep are important for connective tissue resilience across a long season",
    "On match days, eat a familiar pre-match meal — not the time to experiment with new foods",
  ],
};

// ---------- content: stretching ----------
const STRETCH = {
  dynamic: [
    "Leg swings (front-back and side-side) — 10 each leg",
    "Walking lunges with a rotation — 8 each side",
    "High knees and butt kicks — 20m each",
    "Arm circles and crossovers — 10 each direction",
    "Inchworms to hamstring stretch — 5 reps",
  ],
  static: [
    "Hamstring stretch (seated or standing) — 30 sec each leg",
    "Quad stretch — 30 sec each leg",
    "Hip flexor lunge stretch — 30 sec each side",
    "Calf stretch against a wall — 30 sec each leg",
    "Chest and shoulder doorway stretch — 30 sec",
    "Glute stretch (figure-four or pigeon) — 30 sec each side",
    "Child's pose — 30–60 sec",
  ],
  rugbyWarmup: [
    "2 min easy jog to raise core temperature",
    "Lateral shuffles and backpedal — 2 × 20m each",
    "Glute bridge holds — 2 × 10 reps, focus on full extension",
    "Band walks (lateral, mini-band around ankles) — 2 × 10 each direction",
    "Dynamic hip flexor and groin mobilization — 8 each side",
    "Explosive step-ups — 2 × 6 each leg, building into contact and sprint readiness",
  ],
  rugbyCooldown: [
    "3–4 min walk or very easy jog to bring heart rate down gradually",
    "Foam roll quads, IT band, and calves — 60 sec each",
    "Seated hamstring stretch — 30 sec each leg",
    "Lying hip flexor and glute stretch — 30 sec each side",
    "Upper trap and neck side stretch — 20 sec each side (especially after contact sessions)",
    "Slow diaphragmatic breathing — 2 min lying flat, focusing on full exhales",
  ],
  tennisWarmup: [
    "2–3 min skipping or easy jog to raise temperature",
    "Lateral shuffles — 3 × 10m each direction, building pace",
    "Shoulder circles and cross-body arm swings — 15 each direction",
    "Thoracic rotation drills — 8 each side",
    "Split-step into directional sprint — 6 reps, simulating return of serve",
    "Mini groundstroke shadow swings — 10 forehand, 10 backhand, focus on trunk rotation",
  ],
  tennisCooldown: [
    "3–4 min easy walking or slow rally at the net to wind down",
    "Wrist and forearm stretch (flexion and extension) — 20 sec each direction",
    "Shoulder cross-body stretch and doorway chest opener — 30 sec each",
    "Seated spinal rotation — 30 sec each side",
    "Standing quad and hip flexor stretch — 30 sec each leg",
    "Slow breathing + light spinal decompression (hanging from a bar or doorframe) — 30–60 sec",
  ],
  rugbyExtra: [
    "Extra attention to hip flexors and groin given repeated sprinting and change of direction",
    "Thoracic spine rotation stretch — supports contact and passing range of motion",
    "Neck and upper trap stretch after contact-heavy sessions",
  ],
  tennisExtra: [
    "Shoulder and rotator cuff mobility work — high serve and overhead volume demands this",
    "Wrist and forearm stretches — flexion and extension, 20 sec each",
    "Thoracic rotation stretch both directions — supports trunk rotation in groundstrokes and serves",
  ],
};

// ---------- content: hydration ----------
const HYDRATION = {
  baseline: [
    "Sip water consistently through the day rather than relying on large amounts at once",
    "Urine should run pale yellow most of the day — a useful rough check",
    "Increase intake on hot, humid, or high-training-load days",
  ],
  training: [
    "Start sessions already well hydrated — don't wait until you're thirsty mid-session",
    "For sessions over 60 minutes or in heat, have water accessible throughout and drink at breaks",
    "After hard or hot sessions, rehydrate steadily over the following hours rather than all at once",
    "Electrolyte drinks can help on long, hot, or high-sweat sessions — plain water is fine for shorter, cooler ones",
  ],
  signs: [
    "Dark yellow urine or reduced urination",
    "Unusual fatigue, headache, or dizziness during or after training",
    "Cramping, especially late in a session",
    "Noticeable drop in output or focus compared to normal",
  ],
};

// ---------- content: 1-year periodized programs ----------
function makeYear(sportLabel, blocks) {
  // blocks: array of {name, weeksLen, type: 'build'|'taper', days: [...]}
  // We assemble 4 macrocycles, each containing one build + one taper block, spanning ~52 weeks total.
  const macrocycles = [];
  let weekCursor = 1;
  for (let i = 0; i < 4; i++) {
    const build = blocks.build[i % blocks.build.length];
    const taper = blocks.taper[i % blocks.taper.length];
    const buildWeeks = build.weeksLen;
    const taperWeeks = taper.weeksLen;
    const buildSpan = `Weeks ${weekCursor}–${weekCursor + buildWeeks - 1}`;
    weekCursor += buildWeeks;
    const taperSpan = `Weeks ${weekCursor}–${weekCursor + taperWeeks - 1}`;
    weekCursor += taperWeeks;
    macrocycles.push({
      id: `cycle${i + 1}`,
      name: `Macrocycle ${i + 1}`,
      span: `Weeks ${weekCursor - buildWeeks - taperWeeks}–${weekCursor - 1}`,
      blocks: [
        { id: `build${i + 1}`, name: `Build — ${build.name}`, span: buildSpan, blurb: build.blurb, days: build.days.map((d) => ({ ...d, id: `${d.id}-c${i + 1}` })) },
        { id: `taper${i + 1}`, name: `Taper — ${taper.name}`, span: taperSpan, blurb: taper.blurb, days: taper.days.map((d) => ({ ...d, id: `${d.id}-c${i + 1}` })) },
      ],
    });
  }
  return {
    intro: `${sportLabel} — full year, periodized as four Build/Taper macrocycles. Each Build block develops fitness and strength; each Taper cuts volume and sharpens intensity before peak weeks.`,
    macrocycles,
  };
}

const RUGBY_PROGRAM = makeYear("Rugby Sevens", {
  build: [
    {
      name: "Strength & Power Base",
      weeksLen: 8,
      blurb: "Heavier strength work and foundational power, moderate conditioning volume.",
      days: [
        { id: "ru-b1-a", label: "Day A — Strength", exercises: [
          { name: "Back Squat", sets: "4", reps: "6" },
          { name: "Bench Press", sets: "4", reps: "6" },
          { name: "Romanian Deadlift", sets: "3", reps: "8" },
          { name: "Pallof Press", sets: "3", reps: "10/side" },
        ]},
        { id: "ru-b1-b", label: "Day B — Aerobic Base", exercises: [
          { name: "Steady-state run (65–75% effort)", sets: "1", reps: "25 min" },
          { name: "Mobility flow", sets: "1", reps: "10 min" },
        ]},
        { id: "ru-b1-c", label: "Day C — Power", exercises: [
          { name: "Box Jump", sets: "3", reps: "5" },
          { name: "Trap Bar Deadlift", sets: "4", reps: "5" },
          { name: "Broad Jump", sets: "3", reps: "5" },
        ]},
      ],
    },
    {
      name: "Repeat Sprint & Contact",
      weeksLen: 8,
      blurb: "Shift toward repeat-sprint ability, game-speed conditioning, and contact prep.",
      days: [
        { id: "ru-b2-a", label: "Day A — Power & Strength", exercises: [
          { name: "Hang Clean", sets: "5", reps: "3" },
          { name: "Jump Squat", sets: "4", reps: "4" },
          { name: "Back Squat (heavy)", sets: "3", reps: "4" },
        ]},
        { id: "ru-b2-b", label: "Day B — Repeat Sprint", exercises: [
          { name: "Sprint 40m", sets: "6", reps: "1" },
          { name: "Acceleration drills", sets: "4", reps: "1" },
        ], timerPreset: "Repeat Sprint" },
        { id: "ru-b2-c", label: "Day C — Game Sim + Contact", exercises: [
          { name: "Game-sim conditioning", sets: "1", reps: "see timer" },
          { name: "Tackle bag drills", sets: "4", reps: "6" },
        ], timerPreset: "Game Sim (7s)" },
      ],
    },
  ],
  taper: [
    {
      name: "Sharpen",
      weeksLen: 2,
      blurb: "Cut volume sharply, keep intensity brief and sharp, protect recovery before competition.",
      days: [
        { id: "ru-t1-a", label: "Day A — Sharpen", exercises: [
          { name: "Sprint 30m (max effort, full recovery)", sets: "4", reps: "1" },
          { name: "Light power cleans", sets: "3", reps: "3" },
        ]},
        { id: "ru-t1-b", label: "Day B — Light Technical", exercises: [
          { name: "Ball skills / passing", sets: "1", reps: "15 min" },
          { name: "Easy aerobic jog", sets: "1", reps: "15 min" },
        ]},
      ],
    },
  ],
});

const TENNIS_PROGRAM = makeYear("Tennis", {
  build: [
    {
      name: "Strength & Movement Base",
      weeksLen: 8,
      blurb: "General strength, rotational power foundation, and footwork patterning.",
      days: [
        { id: "te-b1-a", label: "Day A — Strength", exercises: [
          { name: "Goblet Squat", sets: "4", reps: "8" },
          { name: "Single-Arm Row", sets: "3", reps: "10/side" },
          { name: "Romanian Deadlift", sets: "3", reps: "8" },
          { name: "Pallof Press", sets: "3", reps: "10/side" },
        ]},
        { id: "te-b1-b", label: "Day B — Footwork & Aerobic Base", exercises: [
          { name: "Ladder footwork drills", sets: "4", reps: "30 sec" },
          { name: "Steady-state run/bike", sets: "1", reps: "25 min" },
        ]},
        { id: "te-b1-c", label: "Day C — Rotational Power", exercises: [
          { name: "Medicine Ball Rotational Throw", sets: "4", reps: "6/side" },
          { name: "Cable Woodchop", sets: "3", reps: "10/side" },
          { name: "Split Squat", sets: "3", reps: "8/leg" },
        ]},
      ],
    },
    {
      name: "Court Speed & Match Endurance",
      weeksLen: 8,
      blurb: "Build toward match-realistic movement, rally endurance, and shoulder durability.",
      days: [
        { id: "te-b2-a", label: "Day A — Power & Strength", exercises: [
          { name: "Trap Bar Jump", sets: "4", reps: "4" },
          { name: "Bulgarian Split Squat", sets: "3", reps: "8/leg" },
          { name: "Med Ball Overhead Slam", sets: "3", reps: "6" },
        ]},
        { id: "te-b2-b", label: "Day B — Point Simulation", exercises: [
          { name: "Lateral shuffle reps", sets: "8", reps: "10 sec" },
          { name: "Recovery sprints", sets: "6", reps: "1" },
        ], timerPreset: "Tennis Point Sim" },
        { id: "te-b2-c", label: "Day C — Rally Endurance + Shoulder Care", exercises: [
          { name: "On-court rally conditioning", sets: "1", reps: "see timer" },
          { name: "Rotator cuff band series", sets: "3", reps: "12/side" },
        ], timerPreset: "Tennis Rally Endurance" },
      ],
    },
  ],
  taper: [
    {
      name: "Sharpen",
      weeksLen: 2,
      blurb: "Reduce volume, keep serve and movement sharp, protect the shoulder before competition.",
      days: [
        { id: "te-t1-a", label: "Day A — Sharpen", exercises: [
          { name: "Serve speed reps (low volume, full recovery)", sets: "3", reps: "6" },
          { name: "Light med ball throws", sets: "3", reps: "5" },
        ]},
        { id: "te-t1-b", label: "Day B — Light Technical", exercises: [
          { name: "Groundstroke rally — easy pace", sets: "1", reps: "15 min" },
          { name: "Footwork patterning (light)", sets: "1", reps: "10 min" },
        ]},
      ],
    },
  ],
});

// ---------- design tokens ----------
const colors = {
  mat: "#2E2C29", matDeep: "#262420", paper: "#F2EFE9", paperDim: "#C9C3B6",
  amber: "#E8B33D", sage: "#8C9A88", coral: "#D1603D", line: "rgba(242,239,233,0.14)", ink: "#211F1C",
};

const styles = {
  app: { minHeight: "100vh", background: colors.mat, color: colors.paper, fontFamily: "'Inter', sans-serif", paddingBottom: 48 },
  header: { position: "sticky", top: 0, zIndex: 5, background: colors.matDeep, borderBottom: `1px solid ${colors.line}`, paddingTop: 18 },
  headerInner: { display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 20px" },
  wordmark: { fontFamily: "'Bebas Neue', 'Inter', sans-serif", fontSize: 32, letterSpacing: "0.08em", margin: 0, color: colors.paper },
  dateChip: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: colors.amber, letterSpacing: "0.04em" },
  sportSwitch: { display: "flex", gap: 8, padding: "12px 20px 0" },
  sportBtn: { flex: 1, background: colors.mat, border: `1px solid ${colors.line}`, borderRadius: 20, color: colors.paperDim, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.04em", padding: "8px 0", cursor: "pointer" },
  sportBtnActive: { background: colors.amber, color: colors.ink, border: `1px solid ${colors.amber}` },
  tabs: { display: "flex", gap: 0, marginTop: 12, padding: "0 12px", overflowX: "auto" },
  tabBtn: { flex: "1 0 auto", padding: "12px 8px", background: "transparent", border: "none", borderBottom: `3px solid transparent`, color: colors.paperDim, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", whiteSpace: "nowrap" },
  tabBtnActive: { color: colors.paper, borderBottom: `3px solid ${colors.amber}` },
  main: { maxWidth: 480, margin: "0 auto", padding: "20px 16px 0" },
  card: { background: colors.matDeep, border: `1px solid ${colors.line}`, borderRadius: 4, padding: 18, marginBottom: 22 },
  cardTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.05em", margin: "0 0 14px", color: colors.paper },
  bodyText: { fontSize: 13.5, color: colors.paperDim, lineHeight: 1.5, margin: "0 0 12px" },
  tipList: { margin: 0, paddingLeft: 18 },
  tipItem: { fontSize: 13.5, color: colors.paper, lineHeight: 1.6, marginBottom: 6 },
  disclaimer: { fontSize: 11.5, color: colors.paperDim, fontStyle: "italic", lineHeight: 1.5, marginTop: -8 },
  input: { width: "100%", background: colors.mat, border: `1px solid ${colors.line}`, borderRadius: 3, color: colors.paper, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, padding: "10px 12px", marginBottom: 12, boxSizing: "border-box" },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  smallInputWrap: { display: "flex", flexDirection: "column" },
  miniLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.paperDim, marginBottom: 6 },
  primaryBtn: { width: "100%", background: colors.amber, color: colors.ink, border: "none", borderRadius: 3, fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: "0.05em", padding: "13px 0", cursor: "pointer" },
  secondaryBtn: { flex: 1, background: colors.coral, color: colors.paper, border: "none", borderRadius: 3, fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: "0.05em", padding: "13px 0", cursor: "pointer" },
  ghostBtn: { flex: 1, background: "transparent", color: colors.paperDim, border: `1px solid ${colors.line}`, borderRadius: 3, fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: "0.05em", padding: "13px 0", cursor: "pointer" },
  sectionLabel: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: "0.06em", color: colors.paperDim, margin: "0 0 12px" },
  empty: { color: colors.paperDim, fontSize: 14, border: `1px dashed ${colors.line}`, borderRadius: 4, padding: "18px 14px", marginBottom: 10 },
  ticketList: { display: "flex", flexDirection: "column", gap: 8 },
  ticket: { position: "relative", display: "flex", alignItems: "center", background: colors.matDeep, border: `1px dashed ${colors.line}`, borderRadius: 3, padding: "12px 14px", overflow: "hidden" },
  ticketPunch: { position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", background: colors.mat, border: `1px solid ${colors.line}` },
  ticketBody: { flex: 1, paddingLeft: 8 },
  ticketName: { fontSize: 15, fontWeight: 600, color: colors.paper },
  ticketMeta: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: colors.amber, marginTop: 2 },
  ticketRemove: { background: "transparent", border: "none", color: colors.paperDim, fontSize: 14, cursor: "pointer", padding: 6 },
  historyBlock: { marginTop: 28 },
  historyToggle: { width: "100%", background: "transparent", border: `1px solid ${colors.line}`, borderRadius: 4, color: colors.paperDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "10px 0", cursor: "pointer" },
  historyDate: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: "0.05em", color: colors.sage, margin: "0 0 8px" },
  timerCard: { background: colors.matDeep, border: `1px solid ${colors.line}`, borderRadius: 4, padding: 22, marginBottom: 22, display: "flex", flexDirection: "column", alignItems: "center" },
  timerStatusRow: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  phasePill: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 20 },
  roundText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: colors.paperDim },
  ringWrap: { position: "relative", width: 220, height: 220, margin: "10px 0 18px" },
  ringCenter: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  clockText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 44, color: colors.paper, fontWeight: 700 },
  timerButtons: { display: "flex", gap: 10, width: "100%" },
  lockNote: { marginTop: 4, fontSize: 12, color: colors.paperDim, fontStyle: "italic" },
  presetGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  presetBtn: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, background: colors.mat, border: `1px solid ${colors.line}`, borderRadius: 3, padding: "10px 12px", cursor: "pointer", textAlign: "left" },
  presetName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.03em", color: colors.paper },
  presetDetail: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.amber },
  programIntro: { fontSize: 13, color: colors.paperDim, lineHeight: 1.5, marginBottom: 18 },
  cycleBlock: { border: `1px solid ${colors.line}`, borderRadius: 4, marginBottom: 14, overflow: "hidden" },
  cycleHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: colors.matDeep, border: "none", padding: "14px 16px", cursor: "pointer", textAlign: "left" },
  cycleName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.05em", color: colors.amber },
  cycleSpan: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.sage, marginTop: 2 },
  cycleBody: { padding: "0 10px 10px" },
  phaseRight: { display: "flex", alignItems: "center", gap: 10, color: colors.paperDim },
  phaseProgress: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: colors.amber },
  phaseBlock: { border: `1px solid ${colors.line}`, borderRadius: 4, marginTop: 10, overflow: "hidden" },
  phaseHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: colors.mat, border: "none", padding: "12px 14px", cursor: "pointer", textAlign: "left" },
  phaseName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: "0.04em", color: colors.paper },
  phaseSpan: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.sage, marginTop: 2 },
  phaseBody: { padding: "0 12px 12px" },
  phaseBlurb: { fontSize: 13, color: colors.paperDim, lineHeight: 1.5, margin: "10px 0 14px" },
  dayCard: { background: colors.mat, border: `1px solid ${colors.line}`, borderRadius: 3, padding: 14, marginBottom: 10 },
  dayHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  checkbox: { width: 22, height: 22, flexShrink: 0, borderRadius: "50%", border: `1px solid ${colors.paperDim}`, background: "transparent", color: colors.ink, fontSize: 13, lineHeight: "20px", cursor: "pointer", padding: 0 },
  checkboxDone: { background: colors.sage, border: `1px solid ${colors.sage}`, color: colors.ink },
  dayLabel: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: "0.03em", color: colors.paper },
  dayLabelDone: { color: colors.sage },
  exList: { listStyle: "none", margin: 0, padding: 0 },
  exItem: { display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0", borderBottom: `1px solid ${colors.line}` },
  exSetsReps: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: colors.amber },
  dayActions: { display: "flex", gap: 8, marginTop: 12 },
  dayActionBtn: { flex: 1, background: colors.amber, color: colors.ink, border: "none", borderRadius: 3, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.04em", padding: "9px 0", cursor: "pointer" },
  dayActionBtnAlt: { flex: 1, background: "transparent", color: colors.paper, border: `1px solid ${colors.paperDim}`, borderRadius: 3, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: "0.04em", padding: "9px 0", cursor: "pointer" },
  saveError: { position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", background: colors.coral, color: colors.paper, fontSize: 13, padding: "8px 14px", borderRadius: 4 },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
* { box-sizing: border-box; }
input:focus, select:focus, button:focus-visible { outline: 2px solid ${colors.amber}; outline-offset: 1px; }
button { transition: opacity 0.15s ease; }
button:hover { opacity: 0.88; }
::placeholder { color: ${colors.paperDim}; opacity: 0.6; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
