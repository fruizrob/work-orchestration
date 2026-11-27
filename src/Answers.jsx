import { stateLabel } from './status.js';

// The three questions the page must answer at a glance: what do I do now, what can an agent take, who am I waiting on.
export default function Answers({ answers, model, done, selected, onOpen }) {
  return (
    <div className="answers">
      {answers.map((a) => (
        <section key={a.owner} className={`answer ${a.owner}`} aria-labelledby={`answer-${a.owner}`}>
          <h2 id={`answer-${a.owner}`}>{a.title}</h2>
          {a.step ? (
            <button type="button" className="answer-btn" aria-expanded={selected === a.step.id}
              onClick={(e) => onOpen(a.step.id, e.currentTarget)}>
              <strong>{a.state === 'ready' && a.owner === 'other' ? model.lanes.get(a.step.lane).name : a.step.title}</strong>
              <span>{hint(a, model, done)}</span>
            </button>
          ) : <p className="quiet">Nothing left today</p>}
        </section>
      ))}
    </div>
  );
}

function hint({ state, step }, model, done) {
  if (state === 'blocked') {
    return `Blocked · ${step.after.filter((id) => !done.has(id)).map((id) => model.steps.get(id).title).join(', ')}`;
  }
  if (state === 'scheduled') return `Starts later today · ${step.start}`;
  if (step.owner !== 'other') return `${step.start} · ${stateLabel(step, 'ready')}`;
  const next = (model.unblocks.get(step.id) ?? []).find((id) => !done.has(id));
  return next ? `Unblocks “${model.steps.get(next).title}”` : step.title;
}
