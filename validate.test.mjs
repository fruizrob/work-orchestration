import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from './validate.mjs';

const load = () => JSON.parse(readFileSync(new URL('./examples/plan.json', import.meta.url), 'utf8'));
const step = (plan, id) => plan.steps.find((s) => s.id === id);

test('the example plan is valid', () => {
  assert.deepEqual(validate(load()), []);
});

test('two steps in one lane cannot overlap', () => {
  const plan = load();
  step(plan, 'post-status-update').start = '09:40';
  assert.match(validate(plan).join('\n'), /"reply-stakeholders" and "post-status-update" overlap/);
});

test('after must name a real step', () => {
  const plan = load();
  step(plan, 'infra-apply').after = ['nope'];
  assert.match(validate(plan).join('\n'), /after "nope": unknown step/);
});

test('a step cannot start before what it waits on ends', () => {
  const plan = load();
  step(plan, 'reply-stakeholders').after = ['fix-ci']; // ends 11:30, step starts 09:30
  assert.match(validate(plan).join('\n'), /starts before it ends \(11:30\)/);
});

test('a step today cannot wait on a later step', () => {
  const plan = load();
  step(plan, 'infra-apply').after = ['approve-release'];
  assert.match(validate(plan).join('\n'), /today cannot wait on a later step/);
});

test('cycles between later steps are caught', () => {
  const plan = load();
  step(plan, 'approve-prod-rollout').after.push('start-rollout'); // both "Mon"
  assert.match(validate(plan).join('\n'), /dependency cycle/);
});
