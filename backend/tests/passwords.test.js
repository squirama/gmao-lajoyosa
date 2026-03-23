const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { hashPassword, verifyPassword } = require('../utils/passwords');

test('hashPassword genera hash scrypt verificable', () => {
    const hash = hashPassword('Secreto123');
    const result = verifyPassword('Secreto123', hash);

    assert.match(hash, /^scrypt\$/);
    assert.equal(result.valid, true);
    assert.equal(result.needsRehash, false);
});

test('verifyPassword acepta hashes legacy sha256 y marca rehash', () => {
    const legacyHash = crypto.createHash('sha256').update('legacy-pass').digest('hex');
    const result = verifyPassword('legacy-pass', legacyHash);

    assert.equal(result.valid, true);
    assert.equal(result.needsRehash, true);
});
