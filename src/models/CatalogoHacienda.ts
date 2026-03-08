/**
 * Catálogos Oficiales - Ministerio de Hacienda Costa Rica V4.3
 * Define las constantes y enumeradores requeridos para la correcta categorización
 * de los datos enviados en los comprobantes electrónicos.
 */

export const UnidadesMedida = {
    Unid: 'Unid', // Unidad
    Sp: 'Sp',     // Servicios Profesionales
    Spe: 'Spe',    // Servicios Personales
    m: 'm',       // Metro
    kg: 'kg',     // Kilogramo
    L: 'L',       // Litro
    h: 'h',       // Hora
    d: 'd',       // Día
    g: 'g',       // Gramo
    cm: 'cm',     // Centímetro
    Gal: 'Gal',   // Galón
    Oz: 'Oz',     // Onza
    Otros: 'Otros'
} as const;

export type UnidadMedidaType = keyof typeof UnidadesMedida;

export const TiposIdentificacion = {
    FISICA: '01',
    JURIDICA: '02',
    DIMEX: '03',
    NITE: '04'
} as const;

export type TipoIdentificacionType = typeof TiposIdentificacion[keyof typeof TiposIdentificacion];

export const CodigosImpuesto = {
    IVA: '01',
    SELECTIVO_CONSUMO: '02',
    UNICO_COMBUSTIBLES: '03',
    ESPECIFICO_BEBIDAS_ALCOHOLICAS: '04',
    ESPECIFICO_BEBIDAS_ENVASADAS: '05',
    PRODUCTOS_TABACO: '06',
    IVA_CALCULO_ESPECIAL: '07'
} as const;

export type CodigoImpuestoType = typeof CodigosImpuesto[keyof typeof CodigosImpuesto];

export const TarifasIVA = {
    EXENTO_0: '01',
    REDUCIDA_1: '02',
    REDUCIDA_2: '03',
    REDUCIDA_4: '04',
    TRANSITORIO_0: '05',
    TRANSITORIO_4: '06',
    TRANSITORIO_8: '07',
    GENERAL_13: '08'
} as const;

export type TarifaIVAType = typeof TarifasIVA[keyof typeof TarifasIVA];

export const MediosPago = {
    EFECTIVO: '01',
    TARJETA: '02',
    CHEQUE: '03',
    TRANSFERENCIA_DEPOSITO: '04',
    RECAUDADO_TERCEROS: '05',
    OTROS: '99'
} as const;

export type MedioPagoType = typeof MediosPago[keyof typeof MediosPago];

export const CondicionesVenta = {
    CONTADO: '01',
    CREDITO: '02',
    CONSIGNACION: '03',
    APARTADO: '04',
    ARRENDAMIENTO_OPCION_COMPRA: '05',
    ARRENDAMIENTO_FUNCION_FINANCIERA: '06',
    COBRO_FAVOR_TERCERO: '07',
    SERVICIOS_ESTADO: '08',
    PAGO_ANTICIPO: '09',
    OTROS: '99'
} as const;

export type CondicionVentaType = typeof CondicionesVenta[keyof typeof CondicionesVenta];

export const MotivosReferenciaNC = {
    ANULA_DOCUMENTO: '01',
    CORRIGE_TEXTO: '02',
    CORRIGE_MONTO: '03',
    REFERENCIA_OTRO: '04',
    SUSTITUYE_CONTINGENCIA: '05',
    OTROS: '99'
} as const;

export type MotivoReferenciaNCType = typeof MotivosReferenciaNC[keyof typeof MotivosReferenciaNC];

export const TiposDocumentoAsociado = {
    FACTURA_ELECTRONICA: '01',
    NOTA_DEBITO: '02',
    NOTA_CREDITO: '03',
    TIQUETE_ELECTRONICO: '04',
    COMPROBANTE_PROVISIONAL_CONTINGENCIA: '08',
    OTROS: '99'
} as const;

export type TipoDocumentoAsociadoType = typeof TiposDocumentoAsociado[keyof typeof TiposDocumentoAsociado];
