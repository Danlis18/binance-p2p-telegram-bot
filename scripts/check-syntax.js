import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const targets = ['src', 'test', 'scripts']
  .flatMap((dir) => files(dir))
  .filter((file) => file.endsWith('.js'));

let failed = false;
for (const file of targets) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
if (failed) process.exit(1);
console.log(`Syntax OK: ${targets.length} files`);
