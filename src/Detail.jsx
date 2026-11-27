import { OWNER_WORD, when } from './layout.js';

export default function Detail({ model, step, isNext, done, onToggleDone, onSelect }) {
  if (!step) {
    return <section className="detail" aria-live="polite"><h2>Everything on your side is done.</h2></section>;
  }
  const needs = step.after;
  const opens = model.unblocks.get(step.id) ?? [];
  const isDone = done.has(step.id);
  const stepList = (ids) => (
    <ul>
      {ids.map((id) => (
        <li key={id}><button type="button" onClick={() => onSelect(id)}>{model.steps.get(id).title}</button></li>
      ))}
    </ul>
  );

  return (
    <section className="detail" aria-live="polite">
      {isNext && <p className="eyebrow">Up next for you</p>}
      <h2>{step.title}</h2>
      <p className="meta">
        <span className={`pill ${step.owner}`}>{OWNER_WORD[step.owner]} · {model.lanes.get(step.lane).name}</span>
        <span>{when(step)}</span>
        {step.priority && <span>{step.priority}</span>}
        {step.critical && <span className="crittag">◆ Critical path</span>}
      </p>
      {step.detail && <p>{step.detail}</p>}
      {step.why && <div><h3>Why you</h3><p>{step.why}</p></div>}
      {(needs.length > 0 || opens.length > 0) && (
        <div className="deps">
          <div>{needs.length > 0 && <><h3>Needs</h3>{stepList(needs)}</>}</div>
          <div>{opens.length > 0 && <><h3>Unblocks</h3>{stepList(opens)}</>}</div>
        </div>
      )}
      {step.links?.length > 0 && (
        <p className="links">
          {step.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}
        </p>
      )}
      <button type="button" className={`btn${isDone ? '' : ' primary'}`} onClick={() => onToggleDone(step.id)}>
        {isDone ? 'Mark not done' : 'Mark done'}
      </button>
    </section>
  );
}
