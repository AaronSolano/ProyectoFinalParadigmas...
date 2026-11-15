import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '@testing-library/jest-dom/vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webNodeModules = path.resolve(__dirname, '../../node_modules');

const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (
  request: string,
  parent: any,
  isMain: boolean,
  options: any,
) {
  if (
    request === 'react' ||
    request.startsWith('react/') ||
    request === 'react-dom' ||
    request.startsWith('react-dom/')
  ) {
    return originalResolveFilename.call(this, request, parent, isMain, {
      ...options,
      paths: [webNodeModules],
    });
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
