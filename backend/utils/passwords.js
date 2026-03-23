const crypto = require('crypto');

const LEGACY_SHA256_REGEX = /^[a-f0-9]{64}$/i;
const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEYLEN = 64;

function hashLegacyPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
    return `${SCRYPT_PREFIX}$${salt}$${derivedKey}`;
}

function verifyScryptPassword(password, passwordHash) {
    const [, salt, storedKey] = passwordHash.split('$');
    if (!salt || !storedKey) return false;

    const derivedKey = crypto.scryptSync(password, salt, storedKey.length / 2);
    const storedBuffer = Buffer.from(storedKey, 'hex');

    if (derivedKey.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, storedBuffer);
}

function verifyPassword(password, passwordHash) {
    if (!passwordHash) return false;

    if (passwordHash.startsWith(`${SCRYPT_PREFIX}$`)) {
        return {
            valid: verifyScryptPassword(password, passwordHash),
            needsRehash: false,
        };
    }

    if (LEGACY_SHA256_REGEX.test(passwordHash)) {
        return {
            valid: hashLegacyPassword(password) === passwordHash,
            needsRehash: true,
        };
    }

    return { valid: false, needsRehash: false };
}

module.exports = {
    hashPassword,
    verifyPassword,
};
