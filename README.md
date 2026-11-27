# Work Orchestrator

Plans a work day as swimlanes: what you must do, what agents run in parallel, and what waits on other people. The page is the **Run Plan**.

```sh
npm install
npm run dev                                # live page: every plans/*.json plus the example, reloads on save
npm test                                   # validator and layout tests
npm run build                              # one self-contained page in dist/index.html (example plan)
PLAN=plans/2026-01-15.json npm run build   # the same, for one of your plans
```

Start your own day with `cp examples/plan.json plans/<date>.json`. `plans/` is gitignored, so your plans stay local.

Needs Node `^20.19` or `>=22.12`.

## Files

| File | Job |
| --- | --- |
| `plans/<date>.json` | Your plan: the only file to edit for a new day. Gitignored. |
| `examples/plan.json` | A generic sample plan. The tests use it. |
| `validate.mjs` | Rejects a plan that is malformed or cannot be scheduled. |
| `vite.config.js` | Serves plans as `virtual:plans`, after validation. A bad plan shows as an error overlay in dev and fails the build. |
| `src/layout.js` | Pure geometry: plan in, box positions and arrows out. |
| `src/App.jsx` | Page state: selected step, critical-path focus, done marks, next step. |
| `src/Board.jsx`, `src/Detail.jsx` | The swimlane board and the step panel. |

## Plan format

```jsonc
{
  "date": "2026-01-15", "timezone": "Europe/London", "asOf": "09:05",
  "day": { "start": "09:00", "end": "17:30" },
  "later": ["Mon", "Tue–Thu"],                         // ordered slots after today
  "breaks": [{ "owner": "you", "start": "12:30", "end": "13:30", "label": "Lunch" }],
  "lanes": [{ "id": "hands-on", "owner": "you", "name": "Hands-on" }],   // owner: you | other | agent
  "steps": [{
    "id": "infra-apply", "lane": "hands-on",
    "start": "10:30", "end": "11:00",                   // today, or "on": "Mon" for a later slot
    "title": "Plan → apply the infra change", "detail": "…", "why": "…",   // why: only for steps that need you
    "priority": "P1", "critical": true,
    "after": ["draft-status-update"],                   // ids this step waits on
    "links": [{ "label": "Runbook", "url": "https://…" }]
  }]
}
```

The validator enforces these rules:

- Ids are unique. Each step names a real lane. Each `after` names a real step.
- A step has either `start` + `end` inside the day, or `on` set to one of the `later` slots.
- Steps in one lane do not overlap.
- A step starts no earlier than the end of each step in its `after` list. A step today cannot wait on a later step.
- There are no dependency cycles.

The view draws an arrow for each `after` entry. An arrow is red when both of its steps are `critical`.
