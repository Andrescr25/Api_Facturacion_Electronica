import crypto from 'crypto';

/**
 * Servicio de cifrado simétrico AES-256-GCM.
 * Úsalo para cifrar credenciales sensibles (passwordAtv, pinCertificado) ANTES
 * de guardarlas en PostgreSQL.
 *
 * Requerimiento: variable de entorno ENCRYPTION_KEY con exactamente 64 caracteres hex
 * (equivale a 32 bytes = 256 bits). Generar con: openssl rand -hex 32
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 96 bits (Recomendado por NIST)
const TAG_LENGTH = 16; // 128 bits (GCM auth tag)

function getKey(): Buffer {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY inválida o no configurada. ' +
            'Debe tener exactamente 64 caracteres hex (32 bytes). ' +
            'Genera una con: openssl rand -hex 32'
        );
    }
    return Buffer.from(hexKey, 'hex');
}

/**
 * Cifra un texto plano y retorna una cadena en formato:
 * <iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descifra una cadena en formato <iv_hex>:<tag_hex>:<ciphertext_hex>.
 * Retorna el texto plano original.
 */
export function decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(':')) {
        // Si el valor no está cifrado (datos legacy en texto plano), retornarlo tal cual.
        // Esto permite la migración gradual.
        return ciphertext;
    }

    const key = getKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        // Formato desconocido, asumir texto plano (compatibilidad legacy)
        return ciphertext;
    }

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

/**
 * Verifica si una cadena ya está cifrada con este servicio.
 * Útil para el script de migración.
 */
export function isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(':');
    return parts.length === 3 && (parts[0].length === 24 || parts[0].length === 32) && parts[1].length === 32;
}
