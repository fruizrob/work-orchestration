# Work Orchestrator

Plans a work day as swimlanes: what you must do, what agents run in parallel, and what waits on other people. The output is one self-contained HTML page, the **Run Plan**.

```sh
npm test                                   # validator tests
node build.mjs plans/2026-11-27.json       # validate + write out/run-plan-2026-11-27.html
```

No dependencies. Needs Node 20+.

## Files

| File | Job |
| --- | --- |
| `plans/<date>.json` | The plan: the only file to edit for a new day. |
| `validate.mjs` | Rejects a plan that is malformed or cannot be scheduled. |
| `build.mjs` | Validates, then inlines the plan into `view.html`. |
| `view.html` | Renders the board. Reads only the inlined plan. |

## Plan format

```jsonc
{
  "date": "2026-11-27", "timezone": "America/Santiago", "asOf": "11:05",
  "day": { "start": "11:00", "end": "17:30" },
  "later": ["Dec 1", "Dec 2–8"],                        // ordered slots after today
  "breaks": [{ "owner": "you", "start": "13:00", "end": "14:00", "label": "Lunch" }],
  "lanes": [{ "id": "hands-on", "owner": "you", "name": "Hands-on" }],   // owner: you | other | agent
  "steps": [{
    "id": "ecr-apply", "lane": "hands-on",
    "start": "12:15", "end": "12:55",                   // today, or "on": "Dec 1" for a later slot
    "title": "ECR plan → apply", "detail": "…", "why": "…",   // why: only for steps that need you
    "priority": "P1", "critical": true,
    "after": ["fix-ci-436"],                            // ids this step waits on
    "links": [{ "label": "INT-695", "url": "https://…" }]
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
