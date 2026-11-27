# Work Orchestrator

## Goal

A quick view to orchestrate one work day. A **Run Plan** puts each piece of work on a swimlane by owner:

- **you**: work only the human can do (decisions, reviews, replies).
- **agent**: work that coding agents run in parallel while you do something else.
- **other**: work that waits on other people.

`after` links show what blocks what. The page must answer three questions at a glance: what do I do now, what can an agent take, and who am I waiting on. Judge every change by how much faster it makes those answers.

README.md has the commands, the file map, the plan format, and the validator rules.

## Conventions

- Plans in `plans/` and built pages in `out/` hold real work details: tickets, people, links. They are gitignored. Commit only code and docs.
- Node built-ins only. A fresh clone runs with no install step.
- Each validator rule lives in `validate.mjs` and is listed in README.md. Change both together, and add a case to `validate.test.mjs`.
- The built page is one self-contained HTML file. `view.html` renders only the inlined plan and loads nothing from the network.

## Known gap

`validate.test.mjs` loads `plans/2026-11-27.json`, which is gitignored. `npm test` fails on a fresh clone until a sanitized example plan is committed and the tests point at it.
