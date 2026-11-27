import { useEffect, useMemo, useState } from 'react';
import plans from 'virtual:plans';
import { layout } from './layout.js';
import Board from './Board.jsx';
import Detail from './Detail.jsx';

export default function App() {
  const [name, setName] = useState(plans[0].name);
  const { plan } = plans.find((p) => p.name === name) ?? plans[0];
  const picker = plans.length > 1 && (
    <select className="btn" aria-label="Plan" value={name} onChange={(e) => setName(e.target.value)}>
      {plans.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
    </select>
  );
  // key: a new plan starts with a fresh selection and its own done marks.
  return <RunPlan key={name} plan={plan} picker={picker} />;
}

function RunPlan({ plan, picker }) {
  const labelWidth = useLabelWidth();
  const model = useMemo(() => layout(plan, labelWidth), [plan, labelWidth]);
  const [done, toggleDone] = useDone(`run-plan:${plan.date}`);
  const [selected, setSelected] = useState(null);
  const [critOn, setCritOn] = useState(false);
  const now = useNow(plan.timezone);

  const next = model.ordered.filter((s) => s.owner === 'you' && !done.has(s.id))
    .sort((a, b) => model.order(a) - model.order(b))[0] ?? null;

  const select = (id, reveal = false) => {
    setSelected(id);
    if (id) setCritOn(false);
    if (id && reveal) requestAnimationFrame(() =>
      document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
  };
  const clear = () => { setSelected(null); setCritOn(false); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') clear(); };
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
            {formatDate(plan.date, { weekday: 'short', month: 'short', day: 'numeric' })} · as of {plan.asOf} · {done.size} of {model.steps.size} done
          </p>
        </div>
        <div className="actions">
          {picker}
          {next && (
            <button type="button" className="btn primary" onClick={() => select(next.id, true)}>
              <span>Next: {next.title} · {next.on ?? next.start}</span>
            </button>
          )}
          <button type="button" className="btn" aria-pressed={critOn} onClick={() => { setSelected(null); setCritOn(!critOn); }}>
            <i className="swatch" />Critical path
          </button>
        </div>
      </header>
      <Board model={model} plan={plan} done={done} selected={selected} critOn={critOn} now={now} startAt={next}
        onSelect={(id) => select(selected === id ? null : id)} onClear={clear} />
      <Detail model={model} step={selected ? model.steps.get(selected) : next} isNext={!selected}
        done={done} onToggleDone={toggleDone} onSelect={(id) => select(id, true)} />
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
function useDone(key) {
  const [done, setDone] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
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
