import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from './validate.mjs';

const load = () => JSON.parse(readFileSync(new URL('./plans/2026-11-27.json', import.meta.url), 'utf8'));
const step = (plan, id) => plan.steps.find((s) => s.id === id);

test('the sample plan is valid', () => {
  assert.deepEqual(validate(load()), []);
});

test('two steps in one lane cannot overlap', () => {
  const plan = load();
  step(plan, 'post-initiative-update').start = '11:20';
  assert.match(validate(plan).join('\n'), /"send-csm-replies" and "post-initiative-update" overlap/);
});

test('after must name a real step', () => {
  const plan = load();
  step(plan, 'ecr-apply').after = ['nope'];
  assert.match(validate(plan).join('\n'), /after "nope": unknown step/);
});

test('a step cannot start before what it waits on ends', () => {
  const plan = load();
  step(plan, 'send-csm-replies').after = ['fix-ci-436']; // ends 12:30, step starts 11:15
  assert.match(validate(plan).join('\n'), /starts before it ends \(12:30\)/);
});

test('a step today cannot wait on a later step', () => {
  const plan = load();
  step(plan, 'ecr-apply').after = ['approve-cutover'];
  assert.match(validate(plan).join('\n'), /today cannot wait on a later step/);
});

test('cycles between later steps are caught', () => {
  const plan = load();
  step(plan, 'approve-prod-dry-run').after.push('start-prod-dry-run'); // both "Dec 1"
  assert.match(validate(plan).join('\n'), /dependency cycle/);
});
