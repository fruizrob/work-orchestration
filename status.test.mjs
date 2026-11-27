import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doneCount, planClock, stepState, summarize } from './src/status.js';

// The concept handoff's example day: a merge that waits on a late release approval.
const steps = [
  { id: 'approval', owner: 'other', lane: 'Release reviewer', title: 'Release approval', start: '10:00', end: '10:30' },
  { id: 'merge', owner: 'you', title: 'Merge the release PR', start: '10:30', end: '11:00', after: ['approval'] },
  { id: 'reply', owner: 'you', title: 'Reply to the feedback', start: '11:00', end: '11:30' },
  { id: 'test', owner: 'agent', title: 'Draft a regression test', start: '11:00', end: '12:00' },
  { id: 'followup', owner: 'you', title: 'Review release results', on: 'Mon' },
];
const answer = (owner, time, done = []) => {
  const { state, step } = summarize(steps, owner, time, new Set(done));
  return [state, step?.id];
};

test('late approval: the ready reply wins over the overdue, blocked merge', () => {
  assert.deepEqual(answer('you', '11:05'), ['ready', 'reply']);
  assert.deepEqual(answer('agent', '11:05'), ['ready', 'test']);
  assert.deepEqual(answer('other', '11:05'), ['ready', 'approval']);
  assert.equal(stepState(steps[1], '11:05', new Set()), 'blocked');
});

test('approval arrives: the merge becomes the next action; undo restores the reply and the wait', () => {
  assert.deepEqual(answer('you', '11:05', ['approval']), ['ready', 'merge']);
  assert.deepEqual(answer('other', '11:05', ['approval']), ['empty', undefined]);
  assert.deepEqual(answer('you', '11:05'), ['ready', 'reply']);
});

test('only a blocker left: the merge shows as blocked', () => {
  assert.deepEqual(answer('you', '11:20', ['reply', 'test']), ['blocked', 'merge']);
});

test('wrapped day: nothing left today, the later step stays open', () => {
  const done = ['approval', 'merge', 'reply', 'test'];
  assert.deepEqual(answer('you', '16:45', done), ['empty', undefined]);
  assert.equal(stepState(steps[4], '16:45', new Set(done)), 'scheduled');
});

test('clock boundaries: before start it is scheduled, at the exact start it is ready', () => {
  assert.deepEqual(answer('you', '09:45'), ['scheduled', 'merge']);
  assert.equal(stepState(steps[2], '10:59', new Set()), 'scheduled');
  assert.equal(stepState(steps[2], '11:00', new Set()), 'ready');
});

test('equal start times keep plan order', () => {
  const tied = [
    { id: 'b', owner: 'you', title: 'B', start: '09:00', end: '09:30' },
    { id: 'a', owner: 'you', title: 'A', start: '09:00', end: '09:30' },
  ];
  assert.equal(summarize(tied, 'you', '09:10', new Set()).step.id, 'b');
});

test('plan clock: live on the plan date, else the asOf snapshot', () => {
  const plan = { date: '2026-01-15', asOf: '09:05' };
  assert.deepEqual(planClock(plan, { date: '2026-01-15', time: '13:27' }), { time: '13:27', live: true });
  assert.deepEqual(planClock(plan, { date: '2026-01-16', time: '08:00' }), { time: '09:05', live: false });
  assert.deepEqual(planClock(plan, null), { time: '09:05', live: false });
});

test('done count ignores marks for steps the plan no longer has', () => {
  assert.equal(doneCount(steps, new Set(['reply', 'removed-step'])), 1);
});
