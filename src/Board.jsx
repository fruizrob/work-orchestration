import { useEffect, useRef } from 'react';
import { OWNER_WORD, dur, minutes, when, whenShort } from './layout.js';

export default function Board({ model, plan, done, selected, critOn, now, startAt, onSelect, onClear }) {
  const scroller = useRef(null);
  const { width, height, labelWidth, axis, xAt, dayStart, dayEnd } = model;

  // Open the board scrolled to your next step.
  useEffect(() => {
    if (startAt && !startAt.on) scroller.current.scrollLeft = Math.max(0, startAt.x - labelWidth - 120);
  }, []);

  const focus = selected ? related(model, selected)
    : critOn ? new Set(model.ordered.filter((s) => s.critical).map((s) => s.id)) : null;
  const dimStep = (id) => Boolean(focus) && !focus.has(id);
  const dimEdge = (e) => Boolean(focus) && !(focus.has(e.from) && focus.has(e.to) && (!critOn || e.crit));
  const showNow = now && now.date === plan.date && minutes(now.time) >= dayStart && minutes(now.time) <= dayEnd;

  return (
    <div className="scroller" ref={scroller} role="region" aria-label="Timeline" tabIndex={0}>
      <div className={`board${focus ? ' focus' : ''}`} style={{ width, height, '--label': `${labelWidth}px` }}
        onClick={(e) => { if (!e.target.closest('.node')) onClear(); }}>
        <div className="row" style={{ top: 0, height: axis }}><div className="label" /></div>
        {model.rows.map((r) => (
          <div key={r.key} className={`row ${r.kind}`} style={{ top: r.y, height: r.h }}>
            {r.kind === 'section' ? (
              <div className={`label ${r.owner}`}>
                <i className="dot" />{r.name}
                {r.owner === 'you' && model.youMinutes > 0 && <small>{dur(model.youMinutes)} today</small>}
              </div>
            ) : <div className="label">{r.name}</div>}
          </div>
        ))}

        {model.ticks.map((t) => (
          <div key={t.x}>
            <div className={`tick${t.label ? '' : ' half'}`} style={{ left: t.x, top: axis }} />
            {t.label && <div className="tlabel" style={{ left: t.x }}>{t.label}</div>}
          </div>
        ))}
        {model.splitX !== null && <div className="tick split" style={{ left: model.splitX }} />}
        {model.slotMarks.map((m) => (
          <div key={m.label}>
            <div className="tick half" style={{ left: m.x, top: axis }} />
            <div className="tlabel" style={{ left: m.x }}>{m.label}</div>
          </div>
        ))}
        {model.breaks.map((b) => (
          <div key={b.key} className="break" style={{ left: b.x, width: b.w, top: b.y, height: b.h }}>{b.label}</div>
        ))}
        {showNow && <div className="nowline" style={{ left: xAt(now.time) }}><span>{now.time}</span></div>}

        <svg className="edges" width={width} height={height} aria-hidden="true">
          <defs>
            {[['arrow', 'var(--muted)'], ['arrow-crit', 'var(--crit)']].map(([id, color]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" style={{ fill: color }} />
              </marker>
            ))}
          </defs>
          {model.edges.map((e) => (
            <path key={e.key} d={e.d} className={`edge${e.crit ? ' crit' : ''}${dimEdge(e) ? ' dim' : ''}`}
              markerEnd={`url(#arrow${e.crit ? '-crit' : ''})`} />
          ))}
        </svg>

        {model.ordered.map((s) => (
          <button key={s.id} id={`step-${s.id}`} type="button" title={s.title}
            className={`node ${s.owner}${done.has(s.id) ? ' done' : ''}${s.id === selected ? ' sel' : ''}${dimStep(s.id) ? ' dim' : ''}`}
            aria-label={`${s.title}. ${OWNER_WORD[s.owner]} · ${model.lanes.get(s.lane).name}. ${when(s)}`}
            aria-pressed={s.id === selected}
            style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
            onClick={() => onSelect(s.id)}>
            <span className="t">{s.title}</span>
            <span className="w">{s.critical && <b>◆ </b>}{whenShort(s)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// The selected step plus everything upstream (what it needs) and downstream (what it unblocks).
function related(model, id) {
  const set = new Set([id]);
  const walk = (cur, next) => { for (const x of next(cur)) if (!set.has(x)) { set.add(x); walk(x, next); } };
  walk(id, (cur) => model.steps.get(cur).after);
  walk(id, (cur) => model.unblocks.get(cur) ?? []);
  return set;
}
