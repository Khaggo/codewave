import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  formatManifestDiagnostics,
  generateAgentManifest,
  inspectAgentManifest,
  parseManifestArgs,
  serializeManifest,
  sha256File,
  updateManifestHashes,
  writeManifestAtomically,
} from './agent-manifest.mjs';

const createFixture = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'agent-manifest-'));
  const docs = path.join(root, 'docs', 'architecture');
  const rolePath = path.join(docs, 'agents', 'role.md');
  const manifestPath = path.join(docs, 'agent-manifest.json');
  mkdirSync(docs, { recursive: true });
  mkdirSync(path.dirname(rolePath), { recursive: true });
  writeFileSync(rolePath, '# Role\n\n## Mission\n\nDo the work.\n');
  const manifest = {
    schemaVersion: 1,
    generatedAt: '2026-08-01T00:00:00.000Z',
    policy: { transactionalReplacement: true },
    files: [{
      path: 'agents/role.md',
      hash: { algorithm: 'sha256', value: sha256File(rolePath) },
    }],
  };
  writeFileSync(manifestPath, serializeManifest(manifest));
  return { root, rolePath, manifestPath, manifest };
};

test('hashes are deterministic and drift diagnostics include expected and actual values', () => {
  const fixture = createFixture();
  try {
    const first = inspectAgentManifest({ rootDirectory: fixture.root });
    assert.equal(first.ok, true);
    const original = readFileSync(fixture.rolePath, 'utf8');
    writeFileSync(fixture.rolePath, `${original}\nChanged.\n`);

    const drift = inspectAgentManifest({ rootDirectory: fixture.root });
    assert.equal(drift.ok, false);
    assert.equal(drift.mismatches.length, 1);
    const diagnostics = formatManifestDiagnostics(drift);
    assert.match(diagnostics, /agents\/role\.md/);
    assert.match(diagnostics, /expected [0-9a-f]{64}, actual [0-9a-f]{64}/);
    assert.equal(sha256File(fixture.rolePath), drift.mismatches[0].actual);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('validation-only generation does not change a drifted manifest', () => {
  const fixture = createFixture();
  try {
    writeFileSync(fixture.rolePath, '# Role\n\nChanged.\n');
    const before = readFileSync(fixture.manifestPath, 'utf8');
    const result = generateAgentManifest({ rootDirectory: fixture.root });
    assert.equal(result.wrote, false);
    assert.equal(result.ok, false);
    assert.equal(readFileSync(fixture.manifestPath, 'utf8'), before);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('explicit write updates only hashes and revalidates the result', () => {
  const fixture = createFixture();
  try {
    writeFileSync(fixture.rolePath, '# Role\n\nUpdated.\n');
    const result = generateAgentManifest({ rootDirectory: fixture.root, write: true });
    assert.equal(result.wrote, true);
    assert.equal(result.ok, true);
    const manifest = JSON.parse(readFileSync(fixture.manifestPath, 'utf8'));
    assert.equal(manifest.generatedAt, fixture.manifest.generatedAt);
    assert.equal(manifest.files[0].hash.value, sha256File(fixture.rolePath));
    assert.equal(existsSync(`${fixture.manifestPath}.tmp`), false);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('atomic replacement leaves the previous file untouched when replacement fails', () => {
  const fixture = createFixture();
  try {
    const original = readFileSync(fixture.manifestPath, 'utf8');
    assert.throws(
      () => writeManifestAtomically({
        manifestPath: fixture.manifestPath,
        contents: '{"new":true}\n',
        rename: () => {
          throw new Error('simulated replacement failure');
        },
      }),
      /simulated replacement failure/,
    );
    assert.equal(readFileSync(fixture.manifestPath, 'utf8'), original);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('manifest update preserves metadata while producing stable hashes', () => {
  const fixture = createFixture();
  try {
    const updatedA = updateManifestHashes(fixture.manifest, fixture.root);
    const updatedB = updateManifestHashes(fixture.manifest, fixture.root);
    assert.deepEqual(updatedA, updatedB);
    assert.equal(updatedA.generatedAt, fixture.manifest.generatedAt);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('parses safe validation and explicit write modes', () => {
  assert.deepEqual(parseManifestArgs([]), {
    write: false,
    json: false,
    manifestPath: 'docs/architecture/agent-manifest.json',
  });
  assert.deepEqual(parseManifestArgs(['--write', '--json', '--manifest=custom.json']), {
    write: true,
    json: true,
    manifestPath: 'custom.json',
  });
});
