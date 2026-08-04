import assert from 'node:assert/strict';
import test from 'node:test';

import { runCheckStages } from './workspace-check-runner.mjs';

test('workspace checks run each stage concurrently and preserve stage order', async () => {
  const calls = [];
  const releases = new Map();
  const runScript = ({ script }) => {
    calls.push(script);
    return new Promise((resolve) => releases.set(script, resolve));
  };
  const run = runCheckStages({
    stages: [
      [{ script: 'first' }, { script: 'second' }],
      [{ script: 'third' }],
    ],
    runScript,
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ['first', 'second']);
  releases.get('first')();
  releases.get('second')();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ['first', 'second', 'third']);
  releases.get('third')();
  await run;
});

test('workspace checks stop before the next stage after a failure', async () => {
  const calls = [];
  await assert.rejects(
    runCheckStages({
      stages: [
        [{ script: 'failed' }, { script: 'completed' }],
        [{ script: 'never-started' }],
      ],
      runScript: async ({ script }) => {
        calls.push(script);
        if (script === 'failed') throw new Error('expected failure');
      },
    }),
    /Workspace checks failed/,
  );
  assert.deepEqual(calls, ['failed', 'completed']);
});
