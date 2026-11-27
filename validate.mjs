// Checks a Run Plan before it is rendered. Returns a list of error strings; empty means valid.
// Rules are listed in README.md. Keep them in sync.

export const OWNERS = ['you', 'other', 'agent'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export function validate(plan) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) return ['plan: must be a JSON object'];
  if (!Array.isArray(plan.lanes)) err('lanes: must be an array');
  if (!Array.isArray(plan.steps)) err('steps: must be an array');
  if (plan.later !== undefined && !Array.isArray(plan.later)) err('later: must be an array of slot labels');
  const laneList = Array.isArray(plan.lanes) ? plan.lanes : [];
  const stepList = Array.isArray(plan.steps) ? plan.steps : [];
  const slots = Array.isArray(plan.later) ? plan.later : [];
  for (const [i, slot] of slots.entries()) {
    if (slots.indexOf(slot) !== i) err(`later: duplicate slot "${slot}"`);
  }
  const afterOf = (s) => (Array.isArray(s.after) ? s.after : []);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.date ?? '')) err('date: use YYYY-MM-DD');
  if (!plan.timezone) err('timezone: required, an IANA name such as "Europe/London"');
  if (!TIME.test(plan.asOf ?? '')) err('asOf: use HH:MM');
  const day = plan.day ?? {};
  if (!TIME.test(day.start ?? '') || !TIME.test(day.end ?? '') || minutes(day.start) >= minutes(day.end)) {
    err('day: needs start and end as HH:MM, with start before end');
    return errors; // every time check below depends on the day window
  }
  const inDay = (t) => minutes(t) >= minutes(day.start) && minutes(t) <= minutes(day.end);

  for (const b of plan.breaks ?? []) {
    if (!OWNERS.includes(b.owner)) err(`break "${b.label}": owner must be one of ${OWNERS.join(', ')}`);
    if (!TIME.test(b.start ?? '') || !TIME.test(b.end ?? '') || !inDay(b.start) || !inDay(b.end)) {
      err(`break "${b.label}": start and end must be HH:MM inside the day`);
    }
  }

  const lanes = new Map();
  for (const lane of laneList) {
    if (lanes.has(lane.id)) err(`lane "${lane.id}": duplicate id`);
    if (!OWNERS.includes(lane.owner)) err(`lane "${lane.id}": owner must be one of ${OWNERS.join(', ')}`);
    if (!lane.name) err(`lane "${lane.id}": name is required`);
    lanes.set(lane.id, lane);
  }

  const steps = new Map();
  for (const s of stepList) {
    const at = `step "${s.id}"`;
    if (!s.id) { err('step without id'); continue; }
    if (steps.has(s.id)) err(`${at}: duplicate id`);
    steps.set(s.id, s);
    if (!lanes.has(s.lane)) err(`${at}: unknown lane "${s.lane}"`);
    if (s.after !== undefined && !(Array.isArray(s.after) && s.after.every((id) => typeof id === 'string'))) {
      err(`${at}: after must be an array of step ids`);
    }
    if (!s.title) err(`${at}: title is required`);
    const today = s.start !== undefined || s.end !== undefined;
    if (today === (s.on !== undefined)) {
      err(`${at}: set either start + end (today) or on (a later slot), not both`);
    } else if (today) {
      if (!TIME.test(s.start ?? '') || !TIME.test(s.end ?? '')) err(`${at}: start and end must be HH:MM`);
      else if (minutes(s.start) >= minutes(s.end)) err(`${at}: start must be before end`);
      else if (!inDay(s.start) || !inDay(s.end)) err(`${at}: must fall inside the day (${day.start}–${day.end})`);
    } else if (!slots.includes(s.on)) {
      err(`${at}: on "${s.on}" is not in later (${slots.join(', ')})`);
    }
    for (const link of s.links ?? []) {
      if (!link.label || !/^https:\/\//.test(link.url ?? '')) err(`${at}: each link needs a label and an https url`);
    }
  }

  // One lane does one thing at a time.
  const isTimed = (s) => TIME.test(s.start ?? '') && TIME.test(s.end ?? '');
  for (const laneId of lanes.keys()) {
    const timed = [...steps.values()].filter((s) => s.lane === laneId && isTimed(s))
      .sort((a, b) => minutes(a.start) - minutes(b.start));
    for (let i = 1; i < timed.length; i++) {
      if (minutes(timed[i].start) < minutes(timed[i - 1].end)) {
        err(`lane "${laneId}": "${timed[i - 1].id}" and "${timed[i].id}" overlap`);
      }
    }
  }

  // A step starts only after everything in its `after` list is finished.
  for (const s of steps.values()) {
    for (const depId of afterOf(s)) {
      const dep = steps.get(depId);
      const at = `step "${s.id}" after "${depId}"`;
      if (!dep) { err(`${at}: unknown step`); continue; }
      if (dep === s) { err(`${at}: a step cannot wait on itself`); continue; }
      if (isTimed(s) && dep.on !== undefined) err(`${at}: a step today cannot wait on a later step`);
      else if (isTimed(s) && isTimed(dep) && minutes(s.start) < minutes(dep.end)) err(`${at}: starts before it ends (${dep.end})`);
      else if (s.on !== undefined && dep.on !== undefined && slots.indexOf(s.on) < slots.indexOf(dep.on)) err(`${at}: is in an earlier slot`);
    }
  }

  // Same-slot later steps can still loop; catch cycles explicitly.
  const state = new Map(); // id -> 'open' | 'done'
  const visit = (id, path) => {
    if (state.get(id) === 'done' || !steps.has(id)) return;
    if (state.get(id) === 'open') { err(`dependency cycle: ${[...path, id].join(' → ')}`); return; }
    state.set(id, 'open');
    for (const dep of afterOf(steps.get(id))) if (dep !== id) visit(dep, [...path, id]);
    state.set(id, 'done');
  };
  for (const id of steps.keys()) visit(id, []);

  return errors;
}
