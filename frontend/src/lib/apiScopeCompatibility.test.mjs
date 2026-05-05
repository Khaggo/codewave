import assert from 'node:assert/strict';
import { normalizeOptionalScopeQuery } from './apiScopeCompatibility.mjs';

assert.equal(normalizeOptionalScopeQuery(undefined), undefined);
assert.equal(normalizeOptionalScopeQuery(''), undefined);
assert.equal(normalizeOptionalScopeQuery('active'), undefined);
assert.equal(normalizeOptionalScopeQuery(' active '), undefined);
assert.equal(normalizeOptionalScopeQuery('history'), 'history');
assert.equal(normalizeOptionalScopeQuery('all'), 'all');

console.log('apiScopeCompatibility tests passed');
