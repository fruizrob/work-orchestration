import { useEffect, useRef } from 'react';
import { OWNER_WORD, when } from './layout.js';
import { overlaps, stateLabel } from './status.js';

export default function Detail({ model, step, states, onToggleDone, onOpen, onClose }) {
  // Move focus to the title whenever a different step opens, so keyboard and screen-reader users land here.
  const title = useRef(null);
  useEffect(() => { title.current.focus(); }, [step.id]);

  const needs = step.after;
  const opens = model.unblocks.get(step.id) ?? [];
  const state = states.get(step.id);
  const clash = overlaps([...model.steps.values()], model.planBreaks).get(step.id);
  const stepList = (ids, withState) => (
    <ul>
      {ids.map((id) => {
        const s = model.steps.get(id);
        return (
          <li key={id}>
            <button type="button" onClick={() => onOpen(id)}>
              {s.title}{withState && <span className="quiet"> · {stateLabel(s, states.get(id))}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="detail" id="detail" aria-labelledby="detail-title"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <header>
        <h2 id="detail-title" ref={title} tabIndex={-1}>{step.title}</h2>
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </header>
      <p className="meta">
        <span className={`pill ${step.owner}`}>{OWNER_WORD[step.owner]} · {model.lanes.get(step.lane).name}</span>
        <span>{when(step)}</span>
        <span className={`state ${state}`}>{stateLabel(step, state)}</span>
        {step.priority && <span>{step.priority}</span>}
        {step.critical && <span className="crittag">◆ Critical path</span>}
      </p>
      {clash && <p className="clash">Overlaps: {clash.join(', ')}</p>}
      {step.detail && <p>{step.detail}</p>}
      {step.why && <div><h3>Why you</h3><p>{step.why}</p></div>}
      {(needs.length > 0 || opens.length > 0) && (
        <div className="deps">
          <div>{needs.length > 0 && <><h3>Needs</h3>{stepList(needs, true)}</>}</div>
          <div>{opens.length > 0 && <><h3>Unblocks</h3>{stepList(opens, false)}</>}</div>
        </div>
      )}
      {step.links?.length > 0 && (
        <p className="links">
          {step.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}
        </p>
      )}
      <button type="button" className={`btn${state === 'done' ? '' : ' primary'}`} onClick={() => onToggleDone(step.id)}>
        {state === 'done' ? 'Undo completion' : 'Mark done'}
      </button>
    </section>
  );
}
