// Pure geometry for the board: plan in, positions out. No DOM, so node --test can check it.

export const GROUPS = [['you', 'You'], ['other', 'Others'], ['agent', 'Agents']];
export const OWNER_WORD = { you: 'You', other: 'Waiting on', agent: 'Agent' };
const PX = 3, PAD = 12, GAP = 36, SLOT = 132, AXIS = 30, SECTION = 28, LANE = 60, NODE_H = 44, MIN_W = 84;

export const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
export const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
export const when = (s) => (s.on ? s.on : `${s.start}–${s.end} · ${dur(minutes(s.end) - minutes(s.start))}`);
export const whenShort = (s) => (s.on ? s.on : `${s.start} · ${dur(minutes(s.end) - minutes(s.start))}`);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function layout(plan, labelWidth) {
  const dayStart = minutes(plan.day.start), dayEnd = minutes(plan.day.end);
  const slots = plan.later ?? [];
  const xAt = (t) => labelWidth + PAD + (minutes(t) - dayStart) * PX;
  const laterX = xAt(plan.day.end) + GAP;
  const width = slots.length ? laterX + slots.length * SLOT + 12 : xAt(plan.day.end) + 24;
  const order = (s) => (s.on ? 10000 + slots.indexOf(s.on) : minutes(s.start));

  const lanes = new Map(plan.lanes.map((l) => [l.id, l]));
  const steps = new Map(plan.steps.map((s) => [s.id, { ...s, owner: lanes.get(s.lane).owner, after: s.after ?? [] }]));
  const unblocks = new Map();
  for (const s of steps.values()) for (const d of s.after) unblocks.set(d, [...(unblocks.get(d) ?? []), s.id]);

  // Rows top to bottom: one section header per owner, then its lanes.
  const rows = [];
  const laneY = new Map();
  let y = AXIS;
  for (const [owner, name] of GROUPS) {
    const groupLanes = plan.lanes.filter((l) => l.owner === owner);
    if (!groupLanes.length) continue;
    rows.push({ kind: 'section', key: `section-${owner}`, owner, name, y, h: SECTION }); y += SECTION;
    for (const lane of groupLanes) {
      rows.push({ kind: 'lane', key: `lane-${lane.id}`, owner, name: lane.name, y, h: LANE });
      laneY.set(lane.id, y); y += LANE;
    }
  }
  const height = y;

  // Step boxes. A short step gets a minimum width, but never covers the next step in its lane.
  for (const lane of plan.lanes) {
    const inLane = [...steps.values()].filter((s) => s.lane === lane.id).sort((a, b) => order(a) - order(b));
    const timed = inLane.filter((s) => !s.on);
    timed.forEach((s, i) => {
      s.x = xAt(s.start);
      s.w = Math.max((minutes(s.end) - minutes(s.start)) * PX - 4, MIN_W);
      if (timed[i + 1]) s.w = Math.min(s.w, xAt(timed[i + 1].start) - s.x - 4);
    });
    inLane.filter((s) => s.on).forEach((s) => { s.x = laterX + slots.indexOf(s.on) * SLOT + 4; s.w = SLOT - 8; });
    inLane.forEach((s) => { s.h = NODE_H; s.y = laneY.get(lane.id) + (LANE - NODE_H) / 2; });
  }
  const ordered = plan.lanes.flatMap((lane) => [...steps.values()].filter((s) => s.lane === lane.id).sort((a, b) => order(a) - order(b)));

  const ticks = [];
  for (let t = dayStart; t <= dayEnd; t += 30) ticks.push({ x: xAt(hhmm(t)), label: t % 60 ? null : hhmm(t).replace(/^0/, '') });
  const slotMarks = slots.map((label, i) => ({ x: laterX + i * SLOT, label }));

  const breaks = (plan.breaks ?? []).flatMap((b) => {
    const groupRows = rows.filter((r) => r.kind === 'lane' && r.owner === b.owner);
    if (!groupRows.length) return [];
    const top = groupRows[0].y + 4, bottom = groupRows.at(-1).y + LANE - 4;
    return [{ key: `${b.owner}-${b.start}`, label: b.label, x: xAt(b.start) + 2, w: (minutes(b.end) - minutes(b.start)) * PX - 4, y: top, h: bottom - top }];
  });

  // One arrow per `after` entry: rightward curve when there is room, else a vertical drop between lanes.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const edges = [];
  for (const t of steps.values()) for (const fromId of t.after) {
    const s = steps.get(fromId);
    let d;
    if (t.x >= s.x + s.w + 12) {
      const sx = s.x + s.w, sy = s.y + s.h / 2, tx = t.x - 1, ty = t.y + t.h / 2, dx = Math.max(22, (tx - sx) / 2);
      d = `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`;
    } else {
      const down = t.y > s.y;
      const sx = clamp(t.x + 18, s.x + 12, s.x + s.w - 12), tx = clamp(sx, t.x + 12, t.x + t.w - 12);
      const sy = down ? s.y + s.h : s.y, ty = down ? t.y - 1 : t.y + t.h + 1, dy = (ty - sy) / 2;
      d = `M${sx},${sy} C${sx},${sy + dy} ${tx},${ty - dy} ${tx},${ty}`;
    }
    edges.push({ key: `${s.id}->${t.id}`, from: s.id, to: t.id, crit: Boolean(s.critical && t.critical), d });
  }

  const youMinutes = [...steps.values()].filter((s) => s.owner === 'you' && !s.on)
    .reduce((sum, s) => sum + minutes(s.end) - minutes(s.start), 0);

  return {
    width, height, labelWidth, axis: AXIS, xAt, dayStart, dayEnd, order,
    lanes, steps, ordered, unblocks, rows, ticks, slotMarks, splitX: slots.length ? laterX - GAP / 2 : null, breaks, edges, youMinutes,
  };
}
