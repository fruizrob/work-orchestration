# Work Orchestrator

## Product standard — simplicity and craft

Apply this standard to every change. Aim for the clarity and polish of Linear and Apple Notes.

- **Purpose.** Give each screen one clear job and an obvious next action.
- **Design.** Make behavior self-evident through layout, hierarchy, spacing, and familiar controls.
- **Copy.** Remove redundant taglines, helper text, and labels. When a screen needs explanation, improve its structure and interaction first. Preserve essential content, accessible names, and actionable errors.
- **Code.** Choose the smallest complete solution. Follow existing patterns, keep changes local, make boundaries clear, and keep data flow explicit. Add abstractions and dependencies only when they reduce overall complexity.
- **Quality.** Improve UX, DX, and AX together.
  - **UX.** Make the app easy to understand, fast to use, and accessible.
  - **DX.** Make the app easy to maintain, test, and debug.
  - **AX.** Make the app easy for agents to discover, reason about, and safely modify.
- **Compatibility.** Preserve working behavior, contracts, and data.

## Goal

A quick view to orchestrate one work day. A **Run Plan** puts each piece of work on a swimlane by owner:

- **you**: work only the human can do (decisions, reviews, replies).
- **agent**: work that coding agents run in parallel while you do something else.
- **other**: work that waits on other people.

`after` links show what blocks what. The page must answer three questions at a glance: what do I do now, what can an agent take, and who am I waiting on. Judge every change by how much faster it makes those answers.

README.md has the commands, the file map, the plan format, and the validator rules.

## Conventions

- Plans in `plans/` and built pages in `dist/` hold real work details: tickets, people, links. They are gitignored. Commit only code, docs and `examples/`.
- Everything committed stays generic: no employer, customer, people, ticket keys or internal URLs. `examples/plan.json` uses made-up work and `example.com` links.
- Stack: React + Vite, plain JSX. Add a dependency only when it removes more code than it adds.
- `npm install`, then `npm test` and `npm run build` must pass on a fresh clone with no `plans/`.
- `package-lock.json` must resolve from `https://registry.npmjs.org/` only. If you install through a private mirror, rewrite its URLs before you commit.
- Each validator rule lives in `validate.mjs` and is listed in README.md. Change both together, and add a case to `validate.test.mjs`.
- `npm run build` writes one self-contained HTML file with one plan inlined. The page loads nothing from the network.
- Keep geometry in `src/layout.js` and status rules in `src/status.js`. Both are pure and tested with `node --test`. Keep state in `src/App.jsx`.
- `examples/run-plan-concept.html` is the design reference for behavior, palette and acceptance cases. Change it and `src/status.js` together.
