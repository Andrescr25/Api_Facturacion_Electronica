/**
 * [VAL-01] Schema de validación Zod para el payload de emisión de comprobantes.
 * Valida el body ANTES de llegar al servicio de Hacienda, retornando errores
 * descriptivos al cliente en lugar de fallar silenciosamente en el XML o en Hacienda.
 */
import { z } from 'zod';

// ── Sub-schemas ────────────────────────────────────────────

const ImpuestoSchema = z.object({
    codigo: z.string().min(2).max(2),
    codigoTarifa: z.string().min(2).max(2),
    tarifa: z.number().nonnegative(),
    monto: z.number().nonnegative()
});

const LineaDetalleSchema = z.object({
    numeroLinea: z.number().int().positive(),
    codigoCabys: z.string().length(13, 'El código CABYS debe tener exactamente 13 dígitos'),
    cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
    unidadMedida: z.enum(['Unid', 'Sp', 'Spe', 'm', 'kg', 'L', 'h', 'd', 'g', 'cm', 'Gal', 'Oz', 'Otros']),
    detalle: z.string().min(1).max(200),
    precioUnitario: z.number().nonnegative(),
    montoTotal: z.number().nonnegative(),
    descuento: z.object({
        monto: z.number().nonnegative(),
        naturaleza: z.string().min(1)
    }).optional(),
    subTotal: z.number().nonnegative(),
    baseImponible: z.number().nonnegative().optional(),
    impuestos: z.array(ImpuestoSchema).optional(),
    impuestoNeto: z.number().nonnegative().optional(),
    montoTotalLinea: z.number().nonnegative()
});

const ReceptorSchema = z.object({
    nombre: z.string().min(1).max(100),
    tipoIdentificacion: z.enum(['01', '02', '03', '04']),
    identificacion: z.string().min(1).max(12),
    correoElectronico: z.string().email('Correo electrónico inválido').optional(),
    ubicacion: z.object({
        provincia: z.string().length(1),
        canton: z.string().length(2),
        distrito: z.string().length(2),
        barrio: z.string().length(2).optional(),
        otrasSenas: z.string().max(160)
    }).optional()
});

const ResumenFacturaSchema = z.object({
    codigoMoneda: z.string().length(3, 'Código de moneda debe ser 3 caracteres (ej. CRC, USD)'),
    tipoCambio: z.number().positive().optional(),
    totalServGravados: z.number().nonnegative(),
    totalServExentos: z.number().nonnegative(),
    totalServExonerados: z.number().nonnegative(),
    totalMercanciasGravadas: z.number().nonnegative(),
    totalMercanciasExentas: z.number().nonnegative(),
    totalMercanciasExonerados: z.number().nonnegative(),
    totalGravado: z.number().nonnegative(),
    totalExento: z.number().nonnegative(),
    totalExonerado: z.number().nonnegative(),
    totalVenta: z.number().nonnegative(),
    totalDescuentos: z.number().nonnegative(),
    totalVentaNeta: z.number().nonnegative(),
    totalImpuesto: z.number().nonnegative(),
    totalComprobante: z.number().positive('totalComprobante debe ser mayor a 0')
});

const ReferenciaSchema = z.object({
    tipoDocumento: z.string().min(2).max(2),
    numeroDocumento: z.string().length(50, 'El número del documento de referencia debe tener 50 dígitos'),
    fechaEmision: z.string().min(1),
    codigo: z.string().min(2).max(2),
    razon: z.string().min(1).max(180)
});

// ── Schema Principal ────────────────────────────────────────

export const FacturaSchema = z.object({
    sucursal: z.number().int().min(1).max(999),
    caja: z.number().int().min(1).max(99999),
    condicionVenta: z.enum(['01', '02', '03', '04', '05', '06', '07', '08', '09', '99']),
    plazoCredito: z.number().int().nonnegative().optional(),
    medioPago: z.array(z.enum(['01', '02', '03', '04', '05', '99'])).min(1, 'Se requiere al menos un medio de pago'),
    receptor: ReceptorSchema.optional(),
    lineasDetalle: z.array(LineaDetalleSchema).min(1, 'Se requiere al menos una línea de detalle'),
    resumenFactura: ResumenFacturaSchema,
    referencias: z.array(ReferenciaSchema).optional()
});

export type FacturaSchemaType = z.infer<typeof FacturaSchema>;
