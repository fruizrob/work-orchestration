import { useEffect, useMemo, useRef, useState } from 'react';
import plans from 'virtual:plans';
import { layout } from './layout.js';
import { OWNER_CARDS, doneCount, planClock, stepState, summarize } from './status.js';
import Answers from './Answers.jsx';
import Board from './Board.jsx';
import Detail from './Detail.jsx';

export default function App() {
  const [name, setName] = useState((plans.find((p) => p.plan) ?? plans[0]).name);
  const entry = plans.find((p) => p.name === name) ?? plans[0];
  // Switching plans remounts the page, picker included; put keyboard focus back on the picker.
  const refocus = useRef(false);
  const picker = plans.length > 1 && (
    <select className="btn" aria-label="Plan" value={entry.name}
      ref={(el) => { if (el && refocus.current) { refocus.current = false; el.focus(); } }}
      onChange={(e) => { refocus.current = true; setName(e.target.value); }}>
      {plans.map((p) => <option key={p.name} value={p.name}>{p.plan ? p.name : `${p.name} · invalid`}</option>)}
    </select>
  );
  // An invalid plan (dev only) lists its errors; it never reaches layout().
  if (!entry.plan) return <InvalidPlan entry={entry} picker={picker} />;
  // key: a new plan starts with a fresh selection and its own done marks.
  return <RunPlan key={entry.name} name={entry.name} plan={entry.plan} picker={picker} />;
}

function InvalidPlan({ entry, picker }) {
  return (
    <div className="page">
      <header className="bar">
        <h1>Run Plan</h1>
        <div className="actions">{picker}</div>
      </header>
      <section className="detail" role="alert">
        <h2>{entry.name}.json</h2>
        <ul>{entry.errors.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>
    </div>
  );
}

function RunPlan({ name, plan, picker }) {
  const labelWidth = useLabelWidth();
  const model = useMemo(() => layout(plan, labelWidth), [plan, labelWidth]);
  const [done, toggleDone] = useDone(`run-plan:${name}`, `run-plan:${plan.date}`);
  const [selected, setSelected] = useState(null);
  const [critOn, setCritOn] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const opener = useRef(null);
  const clock = planClock(plan, useNow(plan.timezone));

  // Everything below derives from the plan, the done marks and the plan clock.
  const planSteps = [...model.steps.values()];
  const states = new Map(planSteps.map((s) => [s.id, stepState(s, clock.time, done)]));
  const answers = OWNER_CARDS.map((card) => ({ ...card, ...summarize(planSteps, card.owner, clock.time, done) }));

  // from: the button that opened the detail; focus returns to it on close.
  const open = (id, from) => {
    if (from) opener.current = from;
    setSelected(id);
    setCritOn(false);
  };
  // Center the selected step in the timeline. Horizontal only, so the page does not jump away from the detail.
  useEffect(() => {
    const node = selected && document.getElementById(`step-${selected}`);
    const scroller = node?.closest('.scroller');
    if (scroller) scroller.scrollLeft = node.offsetLeft - (scroller.clientWidth - node.offsetWidth) / 2;
  }, [selected]);
  const close = () => {
    setSelected(null);
    if (opener.current?.isConnected) opener.current.focus();
  };
  const markDone = (id) => {
    toggleDone(id);
    setAnnouncement(`${model.steps.get(id).title} · ${done.has(id) ? 'Completion undone' : 'Done'}`);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setSelected(null); setCritOn(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { document.title = `Run Plan · ${formatDate(plan.date, { month: 'short', day: 'numeric' })}`; }, [plan.date]);

  return (
    <div className="page">
      <header className="bar">
        <div>
          <h1>Run Plan</h1>
          <p className="meta">
            {formatDate(plan.date, { weekday: 'short', month: 'short', day: 'numeric' })} · {clock.live ? clock.time : `Snapshot ${clock.time}`} · {doneCount(planSteps, done)} of {planSteps.length} done
          </p>
        </div>
        <div className="actions">
          {picker}
          <button type="button" className="btn" aria-pressed={critOn} onClick={() => { setSelected(null); setCritOn(!critOn); }}>
            <i className="swatch" />Critical path
          </button>
        </div>
      </header>
      <Answers answers={answers} model={model} done={done} selected={selected} onOpen={open} />
      {selected && (
        <Detail model={model} step={model.steps.get(selected)} states={states}
          onToggleDone={markDone} onOpen={(id) => open(id)} onClose={close} />
      )}
      <Board model={model} states={states} selected={selected} critOn={critOn} clock={clock}
        onSelect={(id, from) => (selected === id ? close() : open(id, from))} onClear={() => setSelected(null)} />
      <p className="sr-only" role="status">{announcement}</p>
    </div>
  );
}

const formatDate = (date, opts) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

function useLabelWidth() {
  const pick = () => (window.innerWidth < 600 ? 112 : 156);
  const [width, setWidth] = useState(pick);
  useEffect(() => {
    const onResize = () => setWidth(pick());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// Done marks live only in this browser. Storage can be blocked, so every access is guarded.
// legacyKey: marks were once keyed by plan date; read them once when the new key is empty.
function useDone(key, legacyKey) {
  const [done, setDone] = useState(() => {
    try {
      const saved = localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
      if (saved !== null) localStorage.setItem(key, saved); // migrate once, so a later date edit keeps the marks
      return new Set(JSON.parse(saved ?? '[]'));
    } catch { return new Set(); }
  });
  const toggle = (id) => setDone((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
    return next;
  });
  return [done, toggle];
}

// Current date and HH:MM in the plan's timezone, refreshed every 30 s.
function useNow(timeZone) {
  const read = () => {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
      return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
    } catch { return null; }
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNow(read()), 30_000);
    return () => clearInterval(id);
  }, [timeZone]);
  return now;
}
