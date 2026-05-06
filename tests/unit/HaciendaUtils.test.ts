/**
 * Tests unitarios para HaciendaUtils
 * Verifica las reglas de negocio del Ministerio de Hacienda CR:
 * - Consecutivos de 20 dígitos
 * - Claves numéricas de 50 dígitos
 */

import { HaciendaUtils } from '../../src/utils/HaciendaUtils';

describe('HaciendaUtils.generarConsecutivo', () => {

    it('debe generar un consecutivo de exactamente 20 caracteres', () => {
        const result = HaciendaUtils.generarConsecutivo(1, 1, '01', 1);
        expect(result).toHaveLength(20);
    });

    it('debe rellenar sucursal con ceros a la izquierda (3 dígitos)', () => {
        const result = HaciendaUtils.generarConsecutivo(1, 1, '01', 1);
        expect(result.substring(0, 3)).toBe('001');
    });

    it('debe rellenar caja con ceros a la izquierda (5 dígitos)', () => {
        const result = HaciendaUtils.generarConsecutivo(1, 1, '01', 1);
        expect(result.substring(3, 8)).toBe('00001');
    });

    it('debe codificar el tipo de comprobante correctamente (2 dígitos)', () => {
        expect(HaciendaUtils.generarConsecutivo(1, 1, '01', 1).substring(8, 10)).toBe('01');
        expect(HaciendaUtils.generarConsecutivo(1, 1, '04', 1).substring(8, 10)).toBe('04');
    });

    it('debe rellenar el número real con ceros a la izquierda (10 dígitos)', () => {
        const result = HaciendaUtils.generarConsecutivo(1, 1, '01', 1);
        expect(result.substring(10)).toBe('0000000001');
    });

    it('debe manejar valores grandes correctamente', () => {
        const result = HaciendaUtils.generarConsecutivo(999, 99999, '01', 9999999999);
        expect(result).toHaveLength(20);
        expect(result).toBe('999' + '99999' + '01' + '9999999999');
    });
});

describe('HaciendaUtils.generarClave', () => {

    const cedula = '123456789';      // Cédula física (9 dígitos)
    const cedulaJuridica = '3101234567'; // Cédula jurídica (10 dígitos)
    const consecutivo = HaciendaUtils.generarConsecutivo(1, 1, '01', 1);

    it('debe generar una clave de exactamente 50 caracteres', () => {
        const clave = HaciendaUtils.generarClave(cedula, consecutivo);
        expect(clave).toHaveLength(50);
    });

    it('debe empezar con el código de país 506', () => {
        const clave = HaciendaUtils.generarClave(cedula, consecutivo);
        expect(clave.startsWith('506')).toBe(true);
    });

    it('debe rellenar la cédula con ceros a la izquierda (12 dígitos en posición 9-20)', () => {
        const clave = HaciendaUtils.generarClave(cedula, consecutivo);
        const cedulaEnClave = clave.substring(9, 21);
        expect(cedulaEnClave).toBe('000' + cedula);
    });

    it('debe manejar cédula jurídica sin necesidad de relleno adicional', () => {
        const clave = HaciendaUtils.generarClave(cedulaJuridica, consecutivo);
        expect(clave).toHaveLength(50);
    });

    it('debe lanzar un error si la clave generada no tiene 50 caracteres', () => {
        // Una cédula de más de 12 dígitos haría que la clave sea mayor a 50
        expect(() => HaciendaUtils.generarClave('1234567890123', consecutivo)).toThrow();
    });

    it('debe incluir el consecutivo en la clave (posiciones 21-40)', () => {
        const clave = HaciendaUtils.generarClave(cedula, consecutivo);
        const consecutivoEnClave = clave.substring(21, 41);
        expect(consecutivoEnClave).toBe(consecutivo);
    });

    it('debe usar situación 1 (Normal) por defecto', () => {
        const clave = HaciendaUtils.generarClave(cedula, consecutivo);
        expect(clave[41]).toBe('1');
    });
});
