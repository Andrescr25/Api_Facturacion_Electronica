/**
 * Tipos base para la construcción de Comprobantes Electrónicos
 * Basado en Anexo y Estructura XSD v4.3 - Ministerio de Hacienda CR
 */

export interface Receptor {
    nombre: string;
    tipoIdentificacion: '01' | '02' | '03' | '04'; // 01:Física, 02:Jurídica, 03:DIMEX, 04:NITE
    identificacion: string;
    correoElectronico?: string;
    ubicacion?: {
        provincia: string;  // 1 dígito
        canton: string;     // 2 dígitos
        distrito: string;   // 2 dígitos
        barrio?: string;    // 2 dígitos
        otrasSenas: string; // Max 160 chars
    };
}

export interface Impuesto {
    codigo: string;       // Ej. '01' para IVA
    codigoTarifa: string; // Ej. '08' para Tarifa General 13%
    tarifa: number;       // Ej. 13.0
    monto: number;
}

export interface LineaDetalle {
    numeroLinea: number;
    codigoCabys: string;        // Catálogo de Bienes y Servicios (13 dígitos)
    cantidad: number;
    unidadMedida: string;       // Ej. 'Unid', 'Sp', 'm', etc.
    detalle: string;            // Descripción del producto/servicio
    precioUnitario: number;
    montoTotal: number;         // cantidad * precioUnitario
    descuento?: {
        monto: number;
        naturaleza: string;
    };
    subTotal: number;           // montoTotal - descuento
    baseImponible?: number;
    impuestos?: Impuesto[];
    impuestoNeto?: number;
    montoTotalLinea: number;    // subTotal + impuestoNeto
}

export interface ResumenFactura {
    codigoMoneda: string;       // Ej. 'CRC', 'USD'
    tipoCambio?: number;        // Obligatorio si la moneda no es CRC
    totalServGravados: number;
    totalServExentos: number;
    totalServExonerados: number;
    totalMercanciasGravadas: number;
    totalMercanciasExentas: number;
    totalMercanciasExonerados: number;
    totalGravado: number;
    totalExento: number;
    totalExonerado: number;
    totalVenta: number;         // Gravado + Exento + Exonerado
    totalDescuentos: number;
    totalVentaNeta: number;     // Venta - Descuentos
    totalImpuesto: number;
    totalComprobante: number;   // VentaNeta + Impuesto
}

export interface CreacionFacturaRequest {
    sucursal: number;
    caja: number;

    // Condición de venta: 01-Contado, 02-Crédito, etc.
    condicionVenta: '01' | '02' | '03' | '04' | '05' | '99';
    plazoCredito?: number;      // Días

    // Medio de pago: 01-Efectivo, 02-Tarjeta, 03-Cheque, 04-Transferencia, etc.
    medioPago: string[];

    receptor?: Receptor;        // Opcional en Tiquetes, Obligatorio en Facturas
    lineasDetalle: LineaDetalle[];
    resumenFactura: ResumenFactura;

    // Obligatorio para Notas de Crédito y Débito
    referencias?: Referencia[];
}

export interface Referencia {
    tipoDocumento: string; // Ej: '01' (Factura), '02' (Nota de Débito), etc.
    numeroDocumento: string; // Clave de 50 dígitos del documento a afectar
    fechaEmision: string;
    codigo: string; // '01'-Anula Doc de Referencia, '02'-Corrige texto doc ref, '03'-Corrige monto, '04'-Referencia a otro doc, '05'-Sustituye comprobante provisional, '99'-Otros
    razon: string;
}

export interface MensajeReceptorRequest {
    claveExterno: string;        // Los 50 dígitos del comprobante original emitido por el proveedor
    fechaEmisionDoc: string;     // Fecha en el formato XML del emisor
    numeroCedulaEmisor: string;  // Cédula física o jurídica del proveedor
    numeroCedulaReceptor: string; // La cédula de nosotros como empresa receptora
    mensaje: '1' | '2' | '3';    // 1: Aceptado, 2: Aceptación Parcial, 3: Rechazo
    detalleMensaje?: string;     // Opcional, 80 caracteres
    montoTotalImpuesto: number;
    totalFactura: number;
    condicionImpuesto?: '01' | '02' | '03' | '04' | '05'; // Aplica IVA
}
