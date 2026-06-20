import { writeTextFile } from './fs.js';
import type { PlannedChange } from './types.js';

export async function applyChanges(changes: PlannedChange[]): Promise<void> {
  for (const change of changes) {
    if (change.status === 'create' || change.status === 'update') {
      await writeTextFile(change.absolutePath, change.nextContent);
    }
  }
}
