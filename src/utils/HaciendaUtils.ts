/**
 * Utilidad Core para generación de Claves Numéricas y Consecutivos 
 * Ministerio de Hacienda, Costa Rica (Resolución Nº DGT-R-48-2016)
 */

export class HaciendaUtils {

    /**
     * Genera el Consecutivo de 20 dígitos.
     * Estructura: 
     * - 3 dígitos: Casa Matriz/Sucursal (Ej. 001)
     * - 5 dígitos: Punto de Venta/Caja (Ej. 00001)
     * - 2 dígitos: Tipo de Comprobante (Ej. 01 para Factura Electronica)
     * - 10 dígitos: Número de consecutivo real (Ej. 0000000001)
     */
    static generarConsecutivo(
        sucursal: number,
        caja: number,
        tipoComprobante: string,
        numeroReal: number
    ): string {
        const pSucursal = sucursal.toString().padStart(3, '0');
        const pCaja = caja.toString().padStart(5, '0');
        const pTipo = tipoComprobante.padStart(2, '0');
        const pNumero = numeroReal.toString().padStart(10, '0');

        return `${pSucursal}${pCaja}${pTipo}${pNumero}`;
    }

    /**
     * Genera la Clave de 50 dígitos oficial.
     * 
     * Estructura:
     * 1-3 (3): Código País (506)
     * 4-5 (2): Día (DD)
     * 6-7 (2): Mes (MM)
     * 8-9 (2): Año (YY)
     * 10-21 (12): Cédula Emisor (Rellenado con 0s a la izquierda)
     * 22-41 (20): Consecutivo (Ver generarConsecutivo)
     * 42 (1): Situación (1: Normal, 2: Contingencia, 3: Sin Internet)
     * 43-50 (8): Código de Seguridad (Generado o aleatorio controlado)
     */
    static generarClave(
        identificacionEmisor: string,
        consecutivo20: string,
        situacionComprobante: '1' | '2' | '3' = '1',
        codigoSeguridad?: string
    ): string {
        const pais = '506';
        const hoy = new Date();

        // Obtener fecha en formato DDMMYY
        const dia = hoy.getDate().toString().padStart(2, '0');
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const anio = hoy.getFullYear().toString().slice(-2);

        // Cédula: 12 dígitos, rellenado a la izquierda
        const cedula = identificacionEmisor.padStart(12, '0');

        // Si no se provee un código de seguridad de 8 dígitos, genera uno aleatorio (no recomendado en prod real por temas de tracing, pero válido)
        const seguridad = codigoSeguridad
            ? codigoSeguridad.padStart(8, '0').slice(-8)
            : Math.floor(10000000 + Math.random() * 90000000).toString();

        const claveStr = `${pais}${dia}${mes}${anio}${cedula}${consecutivo20}${situacionComprobante}${seguridad}`;

        if (claveStr.length !== 50) {
            throw new Error(`La longitud de la clave generada no es 50 caracteres. Longitud actual: ${claveStr.length}`);
        }

        return claveStr;
    }
}
