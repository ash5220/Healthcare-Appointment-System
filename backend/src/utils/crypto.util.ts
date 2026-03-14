/**
 * Cryptographic Utility
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data at rest.
 * Used primarily to encrypt MFA secrets before database storage.
 *
 * Security Notes:
 * - Uses AES-256-GCM (authenticated encryption) to prevent tampering
 * - Each encryption generates a unique IV (Initialization Vector)
 * - The auth tag is stored alongside the ciphertext for integrity verification
 * - The encryption key MUST be 32 bytes (256 bits)
 */
import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * Derive a 32-byte encryption key from the configured secret.
 * Uses SHA-256 to normalize any-length input to exactly 32 bytes.
 */
const getEncryptionKey = (): Buffer => {
    return crypto.createHash('sha256').update(env.encryptionKey).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Output format: iv:authTag:ciphertext (all hex-encoded)
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in the format iv:authTag:ciphertext
 */
export const encrypt = (plaintext: string): string => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt a string that was encrypted with the encrypt() function.
 *
 * @param encryptedText - Encrypted string in the format iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, or invalid format)
 */
export const decrypt = (encryptedText: string): string => {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Validate expected byte lengths before passing to crypto
    if (iv.length !== IV_LENGTH) {
        throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }
    if (authTag.length !== 16) {
        throw new Error(`Invalid auth tag length: expected 16 bytes, got ${authTag.length}`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Check if a string appears to be encrypted (has our iv:authTag:ciphertext format).
 * Useful for migrating existing plaintext data without breaking.
 *
 * Validates both the presence and lengths of IV (32 hex chars = 16 bytes)
 * and auth tag (32 hex chars = 16 bytes) to avoid false positives.
 */
export const isEncrypted = (value: string): boolean => {
    const parts = value.split(':');
    if (parts.length !== 3) return false;

    const [ivHex, authTagHex] = parts;
    const hexRegex = /^[0-9a-f]+$/i;

    // IV must be exactly 16 bytes = 32 hex chars
    if (ivHex.length !== 32 || !hexRegex.test(ivHex)) return false;
    // Auth tag must be exactly 16 bytes = 32 hex chars
    if (authTagHex.length !== 32 || !hexRegex.test(authTagHex)) return false;
    // Ciphertext must be non-empty valid hex
    if (!parts[2] || !hexRegex.test(parts[2])) return false;

    return true;
};
