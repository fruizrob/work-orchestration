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

test('a plan that is not an object gives one error', () => {
  for (const bad of [null, [], 'plan']) assert.deepEqual(validate(bad), ['plan: must be a JSON object']);
});

test('steps and lanes must be arrays', () => {
  const plan = load();
  delete plan.steps;
  plan.lanes = {};
  const errors = validate(plan).join('\n');
  assert.match(errors, /steps: must be an array/);
  assert.match(errors, /lanes: must be an array/);
});

test('after must be an array of step ids', () => {
  for (const bad of ['fix-ci', { id: 'fix-ci' }, [1]]) {
    const plan = load();
    step(plan, 'infra-apply').after = bad;
    assert.match(validate(plan).join('\n'), /step "infra-apply": after must be an array of step ids/);
  }
});

test('later must be an array of unique slots', () => {
  const plan = load();
  plan.later = 'Mon';
  assert.match(validate(plan).join('\n'), /later: must be an array/);
  plan.later = ['Mon', 'Mon'];
  assert.match(validate(plan).join('\n'), /later: duplicate slot "Mon"/);
  plan.later = ['Mon', ''];
  assert.match(validate(plan).join('\n'), /later: slot 2 must be a non-empty label/);
  plan.later = [{}];
  assert.match(validate(plan).join('\n'), /later: slot 1 must be a non-empty label/);
});

test('a break must start before it ends', () => {
  const plan = load();
  plan.breaks = [{ owner: 'you', start: '12:30', end: '12:30', label: 'Lunch' }];
  assert.match(validate(plan).join('\n'), /break "Lunch": start must be before end/);
});
