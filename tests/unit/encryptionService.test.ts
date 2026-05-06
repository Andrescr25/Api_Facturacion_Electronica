/**
 * Tests unitarios para encryptionService
 * Verifica que el cifrado AES-256-GCM funciona correctamente:
 * - Cifrar y descifrar produce el texto original
 * - El texto cifrado no contiene el texto original
 * - Los datos legacy en texto plano son manejados con compatibilidad
 */

// Configurar la clave de cifrado para los tests
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 chars hex válidos para testing

import { encrypt, decrypt, isEncrypted } from '../../src/utils/encryptionService';

describe('encryptionService.encrypt + decrypt', () => {

    it('decrypt(encrypt(text)) debe retornar el texto original', () => {
        const texto = 'MiPassword123!';
        expect(decrypt(encrypt(texto))).toBe(texto);
    });

    it('debe funcionar con caracteres especiales y Unicode', () => {
        const texto = 'contraseña_ATV_2026! ñ á é @#$%';
        expect(decrypt(encrypt(texto))).toBe(texto);
    });

    it('el texto cifrado NO debe contener el texto original', () => {
        const texto = 'password_secreto';
        const cifrado = encrypt(texto);
        expect(cifrado).not.toContain(texto);
    });

    it('cada cifrado del mismo texto debe producir un resultado diferente (IV aleatorio)', () => {
        const texto = 'mismaPassword';
        const cifrado1 = encrypt(texto);
        const cifrado2 = encrypt(texto);
        expect(cifrado1).not.toBe(cifrado2);
    });

    it('el formato cifrado debe ser iv:tag:ciphertext (3 partes separadas por :)', () => {
        const cifrado = encrypt('test');
        const partes = cifrado.split(':');
        expect(partes).toHaveLength(3);
        expect(partes[0]).toHaveLength(32); // IV en hex (16 bytes)
        expect(partes[1]).toHaveLength(32); // Auth tag en hex (16 bytes)
    });

    it('debe manejar strings vacíos sin error', () => {
        expect(encrypt('')).toBe('');
        expect(decrypt('')).toBe('');
    });
});

describe('encryptionService.decrypt — compatibilidad legacy', () => {

    it('debe retornar el texto plano tal cual si no está en formato cifrado (legacy)', () => {
        const textoLegacy = 'passwordEnTextoPlano';
        expect(decrypt(textoLegacy)).toBe(textoLegacy);
    });

    it('debe retornar el texto plano si tiene menos de 3 partes separadas por :', () => {
        expect(decrypt('solo:dos')).toBe('solo:dos');
    });
});

describe('encryptionService.isEncrypted', () => {

    it('debe retornar true para un string cifrado válido', () => {
        const cifrado = encrypt('algo');
        expect(isEncrypted(cifrado)).toBe(true);
    });

    it('debe retornar false para texto plano', () => {
        expect(isEncrypted('password123')).toBe(false);
    });

    it('debe retornar false para string vacío', () => {
        expect(isEncrypted('')).toBe(false);
    });
});
