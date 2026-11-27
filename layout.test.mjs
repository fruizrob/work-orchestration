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

// Boxes in one lane, left to right, for a small inline plan.
const small = (steps, later = ['Mon', 'Tue']) => layout({
  day: { start: '09:00', end: '17:30' }, later,
  lanes: [{ id: 'a', owner: 'you', name: 'A' }, { id: 'b', owner: 'you', name: 'B' }], steps,
}, 112);
const assertSound = ({ steps }) => {
  for (const s of steps.values()) assert.ok(s.w > 0, `${s.id} has width ${s.w}`);
  for (const lane of ['a', 'b']) {
    const boxes = [...steps.values()].filter((s) => s.lane === lane).sort((x, y) => x.x - y.x);
    for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i - 1].x + boxes[i - 1].w <= boxes[i].x, `${boxes[i - 1].id} covers ${boxes[i].id}`);
  }
};

test('later steps in one lane and slot sit side by side; the slot column fits the biggest stack', () => {
  const m = small([
    { id: 'r1', lane: 'a', on: 'Mon' }, { id: 'r2', lane: 'a', on: 'Mon' }, { id: 'r3', lane: 'a', on: 'Mon' },
    { id: 'o', lane: 'b', on: 'Mon' }, { id: 'p', lane: 'b', on: 'Tue' },
  ]);
  assertSound(m);
  assert.deepEqual(['r1', 'r2', 'r3'].map((id) => m.steps.get(id).x), [...Array(3)].map((_, j) => m.slotMarks[0].x + 4 + j * 132));
  assert.equal(m.steps.get('o').x, m.slotMarks[0].x + 4, 'lanes share the slot start');
  assert.equal(m.slotMarks[1].x - m.slotMarks[0].x, 3 * 132);
  assert.equal(m.steps.get('p').x, m.slotMarks[1].x + 4);
  const last = [...m.steps.values()].reduce((max, s) => Math.max(max, s.x + s.w), 0);
  assert.ok(m.width >= last, 'board covers the last box');
});

test('a slot with at most one step per lane keeps the base width', () => {
  const m = small([{ id: 'x', lane: 'a', on: 'Mon' }, { id: 'y', lane: 'b', on: 'Mon' }]);
  assert.equal(m.slotMarks[1].x - m.slotMarks[0].x, 132);
  assert.equal(m.width, m.slotMarks[1].x + 132 + 12);
});

test('slot marks increase and the board covers the last slot', () => {
  const m = small([{ id: 'x', lane: 'a', on: 'Mon' }, { id: 'y', lane: 'a', on: 'Mon' }, { id: 'z', lane: 'b', on: 'Tue' }]);
  for (let i = 1; i < m.slotMarks.length; i++) assert.ok(m.slotMarks[i].x > m.slotMarks[i - 1].x);
  assert.ok(m.width > m.slotMarks.at(-1).x + 132);
});

test('consecutive one-minute steps keep a positive width and stay apart', () => {
  const m = small([
    { id: 'p', lane: 'a', start: '10:00', end: '10:01' }, { id: 'q', lane: 'a', start: '10:01', end: '10:02' },
    { id: 'r', lane: 'a', start: '10:02', end: '10:03' }, { id: 's', lane: 'a', start: '17:29', end: '17:30' },
    { id: 't', lane: 'a', on: 'Mon' },
  ]);
  assertSound(m);
});
