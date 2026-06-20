import path from 'node:path';

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function relativePath(rootDir: string, absolutePath: string): string {
  return toPosixPath(path.relative(rootDir, absolutePath));
}
