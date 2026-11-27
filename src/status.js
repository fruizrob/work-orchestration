// Pure status rules: which steps are done, ready, blocked or scheduled at a given plan clock.
// Definitions follow examples/run-plan-concept.html. No DOM, so node --test can check it.
import { minutes } from './layout.js';

export const OWNER_CARDS = [
  { owner: 'you', title: 'Your next action' },
  { owner: 'agent', title: 'Agent work' },
  { owner: 'other', title: 'Waiting on' },
];

const READY_LABEL = { you: 'Ready', agent: 'Ready for handoff', other: 'Waiting' };

// The plan clock: live time on the plan's own date, else the plan's asOf time as a snapshot.
export function planClock(plan, now) {
  return now && now.date === plan.date ? { time: now.time, live: true } : { time: plan.asOf, live: false };
}

// done: Set of step ids. A passed end time never clears a prerequisite; only a done mark does.
export function stepState(step, time, done) {
  if (done.has(step.id)) return 'done';
  if (step.start && minutes(step.start) <= minutes(time)) {
    return (step.after ?? []).some((id) => !done.has(id)) ? 'blocked' : 'ready';
  }
  return 'scheduled';
}

export function stateLabel(step, state) {
  return state === 'ready' ? READY_LABEL[step.owner] : { blocked: 'Blocked', scheduled: 'Scheduled', done: 'Done' }[state];
}

// One answer per owner: the earliest ready step, else the earliest blocked one, else the next scheduled one.
// steps: plan order, each with `owner`. Ties on start time keep plan order (Array.sort is stable).
export function summarize(steps, owner, time, done) {
  const open = steps.filter((s) => s.owner === owner && s.start && !done.has(s.id))
    .sort((a, b) => minutes(a.start) - minutes(b.start));
  for (const state of ['ready', 'blocked', 'scheduled']) {
    const step = open.find((s) => stepState(s, time, done) === state);
    if (step) return { state, step };
  }
  return { state: 'empty' };
}

// Done marks can outlive a plan edit; count only ids the plan still has.
export const doneCount = (steps, done) => steps.filter((s) => done.has(s.id)).length;
