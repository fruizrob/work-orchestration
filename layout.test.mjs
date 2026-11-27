import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { layout } from './src/layout.js';

const plan = JSON.parse(readFileSync(new URL('./examples/plan.json', import.meta.url), 'utf8'));

test('step boxes in one lane never overlap on screen', () => {
  for (const labelWidth of [112, 156]) {
    const { steps } = layout(plan, labelWidth);
    for (const lane of plan.lanes) {
      const boxes = [...steps.values()].filter((s) => s.lane === lane.id).sort((a, b) => a.x - b.x);
      for (let i = 1; i < boxes.length; i++) {
        assert.ok(boxes[i - 1].x + boxes[i - 1].w <= boxes[i].x, `${boxes[i - 1].id} covers ${boxes[i].id}`);
      }
    }
  }
});

test('an arrow is critical only when both of its steps are', () => {
  const { edges, steps } = layout(plan, 156);
  assert.equal(edges.length, plan.steps.reduce((n, s) => n + (s.after?.length ?? 0), 0));
  for (const e of edges) assert.equal(e.crit, Boolean(steps.get(e.from).critical && steps.get(e.to).critical));
});
