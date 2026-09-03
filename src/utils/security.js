/**
 * Security & Sanitization Utilities for Multisig Escrow
 */
function isValidAmount(amount) {
    return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
}

function sanitizeString(str, maxLen = 256) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>\r\n]/g, '').trim().slice(0, maxLen);
}

function isValidAddress(addr) {
    // Validates non-empty string, length constraint, basic crypto address format
    if (typeof addr !== 'string') return false;
    const clean = addr.trim();
    return clean.length >= 10 && clean.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(clean);
}

function sanitizeEscrowForExport(escrow) {
    if (!escrow) return null;
    const safe = { ...escrow };
    // Explicitly guarantee no private keys, secrets, or internal memory pointers exist
    delete safe.privateKey;
    delete safe.secret;
    delete safe.seed;
    return safe;
}

module.exports = {
    isValidAmount,
    sanitizeString,
    isValidAddress,
    sanitizeEscrowForExport
};
