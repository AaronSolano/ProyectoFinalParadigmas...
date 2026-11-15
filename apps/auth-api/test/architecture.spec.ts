import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const eslint = resolve(
  require.resolve('eslint/package.json'),
  '..',
  'bin',
  'eslint.js',
);
function check(source: string, filename: string) {
  return spawnSync(
    process.execPath,
    [eslint, '--stdin', '--stdin-filename', filename, '--format', 'json'],
    {
      cwd: resolve(__dirname, '..'),
      input: source,
      encoding: 'utf8',
    },
  );
}

describe('layer boundaries enforced by ESLint', () => {
  test.each([
    [
      'src/domain/nested/probe.ts',
      "export { Repository } from '../../data/repository';",
    ],
    [
      'src/domain/probe.ts',
      "export type { Service } from '../application/service';",
    ],
    [
      'src/domain/probe.ts',
      "export { Controller } from '../presentation/http';",
    ],
    ['src/domain/probe.ts', "export { Injectable } from '@nestjs/common';"],
    ['src/domain/probe.ts', "export { Entity } from 'typeorm';"],
    ['src/domain/probe.ts', "export type { Request } from 'express';"],
    ['src/domain/probe.ts', "export { Server } from 'socket.io';"],
    [
      'src/application/nested/probe.ts',
      "export type { Row } from '../../data/repository';",
    ],
    [
      'src/application/probe.ts',
      "export { Controller } from '../presentation/http';",
    ],
    ['src/application/probe.ts', "export { Entity } from 'typeorm';"],
    [
      'src/presentation/probe.ts',
      "export { RsaTokens } from '../data/credentials';",
    ],
    [
      'src/domain/probe.ts',
      "import type { Row } from '../data/repository'; export type { Row };",
    ],
  ])('rejects %s: %s', (filename, source) => {
    const result = check(source, filename);
    expect(result.status).toBe(1);
    const reports = JSON.parse(result.stdout) as Array<{
      messages: Array<{ ruleId: string }>;
    }>;
    expect(
      reports
        .flatMap((report) => report.messages)
        .some((message) => message.ruleId === 'no-restricted-imports'),
    ).toBe(true);
  });
  test('allows application to depend on domain ports', () => {
    const result = check(
      "export type { Tokens } from '../domain/profile';",
      'src/application/probe.ts',
    );
    expect(result.status).toBe(0);
  });
});
