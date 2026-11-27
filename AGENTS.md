# Work Orchestrator

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
- Keep geometry in `src/layout.js` (pure, tested with `node --test`) and state in `src/App.jsx`.
