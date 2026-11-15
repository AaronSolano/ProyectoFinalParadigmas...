const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
// Each suite owns its Node loader and global OpenTelemetry providers.
// Jest's VM ESM cache otherwise retains a disposed environment across suites.
const suites =
  process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync('test')
        .filter((name) => name.endsWith('.spec.ts'))
        .map((name) => 'test/' + name);
for (const suite of suites) {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      require.resolve('jest/bin/jest'),
      '--runInBand',
      '--runTestsByPath',
      suite,
    ],
    { stdio: 'inherit', env: process.env },
  );
  if (result.status !== 0) process.exitCode = result.status || 1;
}
