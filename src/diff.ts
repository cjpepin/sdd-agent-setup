export function createUnifiedDiff(path: string, previousContent: string | null, nextContent: string): string {
  const previousLines = previousContent === null ? [] : previousContent.split('\n');
  const nextLines = nextContent.split('\n');
  const previousSet = new Set(previousLines);
  const nextSet = new Set(nextLines);
  const lines = [`--- ${previousContent === null ? '/dev/null' : path}`, `+++ ${path}`];

  if (previousContent === nextContent) {
    return '';
  }

  if (previousContent === null) {
    lines.push(...nextLines.map((line) => `+${line}`));
    return lines.join('\n');
  }

  let previousIndex = 0;
  let nextIndex = 0;
  while (previousIndex < previousLines.length || nextIndex < nextLines.length) {
    const previousLine = previousLines[previousIndex];
    const nextLine = nextLines[nextIndex];

    if (previousLine === nextLine) {
      lines.push(` ${previousLine}`);
      previousIndex += 1;
      nextIndex += 1;
      continue;
    }

    if (previousLine !== undefined && !nextSet.has(previousLine)) {
      lines.push(`-${previousLine}`);
      previousIndex += 1;
      continue;
    }

    if (nextLine !== undefined && !previousSet.has(nextLine)) {
      lines.push(`+${nextLine}`);
      nextIndex += 1;
      continue;
    }

    if (previousLine !== undefined) {
      lines.push(`-${previousLine}`);
      previousIndex += 1;
    }
    if (nextLine !== undefined) {
      lines.push(`+${nextLine}`);
      nextIndex += 1;
    }
  }

  return lines.join('\n');
}
