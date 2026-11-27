import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { validate } from './validate.mjs';

export default defineConfig({
  plugins: [react(), viteSingleFile(), plans()],
});

// `virtual:plans` exports [{ name, plan }], validated with validate.mjs.
// - dev:   every plans/*.json, newest first, then examples/plan.json. Edits reload the page.
// - build: only the file in PLAN (default examples/plan.json), so a shared page holds one plan.
function plans() {
  const ID = 'virtual:plans', RESOLVED = `\0${ID}`;
  let command = 'serve';
  const files = () => {
    if (command === 'build') return [resolve(process.env.PLAN ?? 'examples/plan.json')];
    const own = existsSync('plans') ? readdirSync('plans').filter((f) => f.endsWith('.json')).sort().reverse() : [];
    return [...own.map((f) => resolve('plans', f)), resolve('examples/plan.json')];
  };
  const isPlan = (file) => file.endsWith('.json') && (file.startsWith(resolve('plans')) || file.startsWith(resolve('examples')));

  return {
    name: 'run-plans',
    configResolved(config) { command = config.command; },
    resolveId(id) { return id === ID ? RESOLVED : undefined; },
    load(id) {
      if (id !== RESOLVED) return;
      const list = files().map((file) => {
        const name = relative(process.cwd(), file).replace(/\.json$/, '');
        this.addWatchFile(file);
        let plan;
        try { plan = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { this.error(`${name}.json: ${e.message}`); }
        const errors = validate(plan);
        if (errors.length) this.error(`${name}.json: ${errors.length} problem(s)\n${errors.map((e) => `  - ${e}`).join('\n')}`);
        return { name, plan };
      });
      return `export default ${JSON.stringify(list)};`;
    },
    configureServer(server) {
      server.watcher.add(resolve('plans'));
      const reload = (file) => {
        if (!isPlan(file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('change', reload);
      server.watcher.on('unlink', reload);
    },
  };
}
