const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFilePayload, mergeDonors, normalizeDonors } = require('../github-storage');

test('buildFilePayload wraps donors in the expected JSON structure', () => {
  const payload = buildFilePayload([{ name: 'Ali' }, { name: 'Sara' }]);
  assert.deepStrictEqual(JSON.parse(payload), {
    donors: [{ name: 'Ali' }, { name: 'Sara' }],
  });
});

test('normalizeDonors removes invalid entries and keeps valid objects', () => {
  const donors = normalizeDonors([null, { name: 'Ali' }, 'bad', { name: 'Sara' }]);
  assert.deepStrictEqual(donors, [{ name: 'Ali' }, { name: 'Sara' }]);
});

test('mergeDonors prefers remote data and falls back to local data when needed', () => {
  const merged = mergeDonors([{ name: 'Local' }], [{ name: 'Remote' }]);
  assert.deepStrictEqual(merged, [{ name: 'Remote' }]);

  const fallback = mergeDonors([{ name: 'Local' }], []);
  assert.deepStrictEqual(fallback, [{ name: 'Local' }]);
});
