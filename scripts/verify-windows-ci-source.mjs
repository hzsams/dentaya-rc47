import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

export async function verifyWindowsCiSource({project = process.cwd(), commit, ref = '', git = promisify(execFile)} = {}) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw Error('An exact source commit is required.');
  const options = {cwd: project, encoding: 'utf8', shell: false, windowsHide: true};
  const head = (await git('git', ['rev-parse', 'HEAD'], options)).stdout.trim();
  if (head !== commit) throw Error('The checkout does not match the requested source commit.');
  await git('git', ['diff', '--exit-code', 'HEAD', '--'], options);
  const pkg = JSON.parse(await fs.readFile(path.join(project, 'package.json'), 'utf8'));
  const lock = JSON.parse(await fs.readFile(path.join(project, 'package-lock.json'), 'utf8'));
  if (pkg.name !== 'dentaya-production-rc' || !/^1\.0\.0-rc\.\d+$/.test(pkg.version) || lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) throw Error('Source and lockfile release versions do not match.');
  if (ref.startsWith('refs/tags/')) {
    const tag = ref.slice('refs/tags/'.length);
    if (![pkg.version, `v${pkg.version}`].includes(tag)) throw Error('Release tag does not match package.json.');
    if ((await git('git', ['rev-parse', `${ref}^{commit}`], options)).stdout.trim() !== commit) throw Error('The tag does not identify this source commit.');
  }
  return {commit, version: pkg.version, ref};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {project: {type: 'string'}, commit: {type: 'string'}, ref: {type: 'string'}}});
  verifyWindowsCiSource(values).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.message); process.exitCode = 1;});
}
