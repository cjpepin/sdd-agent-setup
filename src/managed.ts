import { managedEnd, managedStart } from './constants.js';

export function wrapManaged(content: string): string {
  return `${managedStart}
${content.trim()}
${managedEnd}
`;
}

export function hasManagedBlock(content: string): boolean {
  return content.includes(managedStart) && content.includes(managedEnd);
}

export function replaceManagedBlock(previousContent: string, managedContent: string): string {
  const start = previousContent.indexOf(managedStart);
  const end = previousContent.indexOf(managedEnd);

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Missing managed block');
  }

  const afterEnd = end + managedEnd.length;
  const before = previousContent.slice(0, start).trimEnd();
  const after = previousContent.slice(afterEnd).trimStart();
  const replacement = wrapManaged(managedContent);

  if (!before && !after) {
    return replacement;
  }

  if (!before) {
    return `${replacement}\n${after}`;
  }

  if (!after) {
    return `${before}\n\n${replacement}`;
  }

  return `${before}\n\n${replacement}\n${after}`;
}
