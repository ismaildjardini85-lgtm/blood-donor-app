const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFilePayload, normalizeDonors } = require('../github-storage');

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
