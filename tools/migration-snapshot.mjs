import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const resolveLatestMigrationSnapshot = (root = process.cwd()) => {
  const metaDirectory = path.join(root, 'backend', 'drizzle', 'meta');
  const journalPath = path.join(metaDirectory, '_journal.json');
  if (!existsSync(journalPath)) {
    throw new Error(`Migration journal is missing: ${journalPath}`);
  }

  let journal;
  try {
    journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  } catch (error) {
    throw new Error(`Migration journal is not valid JSON: ${journalPath}`, {
      cause: error,
    });
  }

  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    throw new Error('Migration journal must contain at least one entry.');
  }

  const indexes = journal.entries.map((entry) => entry?.idx);
  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    throw new Error('Migration journal contains an invalid migration index.');
  }
  if (new Set(indexes).size !== indexes.length) {
    throw new Error('Migration journal contains duplicate migration indexes.');
  }

  const latestIndex = Math.max(...indexes);
  const snapshotPath = path.join(
    metaDirectory,
    `${String(latestIndex).padStart(4, '0')}_snapshot.json`,
  );
  if (!existsSync(snapshotPath)) {
    throw new Error(`Latest migration snapshot is missing: ${snapshotPath}`);
  }
  return snapshotPath;
};
