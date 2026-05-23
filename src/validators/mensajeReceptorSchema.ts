import { z } from 'zod';

export const MensajeReceptorSchema = z.object({
    claveExterno: z.string().length(50, 'La clave del documento externo debe tener exactamente 50 dígitos'),
    fechaEmisionDoc: z.string().min(1, 'La fecha de emisión del documento es requerida'),
    numeroCedulaEmisor: z.string().min(9, 'La cédula del emisor debe tener al menos 9 caracteres').max(12, 'La cédula del emisor debe tener máximo 12 caracteres'),
    numeroCedulaReceptor: z.string().min(9, 'La cédula del receptor debe tener al menos 9 caracteres').max(12, 'La cédula del receptor debe tener máximo 12 caracteres'),
    mensaje: z.enum(['1', '2', '3']),
    detalleMensaje: z.string().max(80, 'El detalle del mensaje no debe superar los 80 caracteres').optional(),
    montoTotalImpuesto: z.number().nonnegative('El monto total de impuesto debe ser mayor o igual a 0'),
    totalFactura: z.number().nonnegative('El total de la factura debe ser mayor o igual a 0'),
    condicionImpuesto: z.enum(['01', '02', '03', '04', '05']).optional()
});

export type MensajeReceptorSchemaType = z.infer<typeof MensajeReceptorSchema>;
