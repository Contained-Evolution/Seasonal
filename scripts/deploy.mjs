import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2]; const requestedVersion = process.argv[3];
if (!['preview', 'production'].includes(mode)) throw new Error('Use preview or production.');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (mode === 'production' && (requestedVersion !== packageJson.version || process.env.CE_RELEASE_CONFIRM !== `seasonal-v${packageJson.version}`)) {
  throw new Error(`Production requires version ${packageJson.version} and CE_RELEASE_CONFIRM=seasonal-v${packageJson.version}.`);
}
const run = (command, args) => { const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' }); if (result.status !== 0) process.exit(result.status ?? 1); };
run('npm', ['run', 'build']);
const args = ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'seasonal'];
if (mode === 'preview') args.push('--branch', 'preview');
run('npx', args);
