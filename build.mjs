// Usage: node build.mjs plans/2026-11-27.json [out/run-plan-2026-11-27.html]
// Validates the plan, then writes one self-contained HTML file (view.html with the plan inlined).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { validate } from './validate.mjs';

const [planPath, outArg] = process.argv.slice(2);
if (!planPath) {
  console.error('Usage: node build.mjs <plan.json> [out.html]');
  process.exit(2);
}

const plan = JSON.parse(await readFile(planPath, 'utf8'));
const errors = validate(plan);
if (errors.length) {
  console.error(`${planPath}: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

const date = new Date(`${plan.date}T12:00:00Z`);
const title = `Run Plan ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
const template = await readFile(new URL('./view.html', import.meta.url), 'utf8');
const html = template
  .replace('__TITLE__', title)
  // Escape "<" so plan text can never close the <script> tag.
  .replace('/*PLAN*/null', () => JSON.stringify(plan).replaceAll('<', '\\u003c'));

const out = outArg ?? `out/run-plan-${basename(planPath, '.json')}.html`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(out);
