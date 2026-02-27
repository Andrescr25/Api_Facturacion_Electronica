import { create } from 'xmlbuilder2';
import { CreacionFacturaRequest, MensajeReceptorRequest } from '../models/FacturaTypes';
import { EmisorCredenciales } from '@prisma/client';
import { HaciendaUtils } from './HaciendaUtils';

export class HaciendaXmlGenerator {

    /**
     * Genera el XML en formato Oficial 4.3 para FE, TE, NC, ND.
     */
    static generarComprobanteXML(
        request: CreacionFacturaRequest,
        emisor: EmisorCredenciales,
        consecutivoReal: number,
        tipoDocumento: '01' | '02' | '03' | '04'
    ): { xml: string; clave: string; consecutivo: string } {

        const consecutivo = HaciendaUtils.generarConsecutivo(request.sucursal, request.caja, tipoDocumento, consecutivoReal);
        const clave = HaciendaUtils.generarClave(emisor.identificacion, consecutivo, '1');
        const fechaHora = new Date().toISOString();

        let rootName = 'FacturaElectronica';
        let ns = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica';

        switch (tipoDocumento) {
            case '02':
                rootName = 'NotaDebitoElectronica';
                ns = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/notaDebitoElectronica';
                break;
            case '03':
                rootName = 'NotaCreditoElectronica';
                ns = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/notaCreditoElectronica';
                break;
            case '04':
                rootName = 'TiqueteElectronico';
                ns = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/tiqueteElectronico';
                break;
        }

        const doc = create({ version: '1.0', encoding: 'utf-8' })
            .ele(rootName, {
                xmlns: ns,
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
            });

        doc.ele('Clave').txt(clave).up()
            .ele('CodigoActividad').txt('123456').up()
            .ele('NumeroConsecutivo').txt(consecutivo).up()
            .ele('FechaEmision').txt(fechaHora).up();

        const nodoEmisor = doc.ele('Emisor');
        nodoEmisor.ele('Nombre').txt(emisor.nombre).up();
        const tipoIdEmisor = emisor.identificacion.length === 9 ? '01' : '02';
        nodoEmisor.ele('Identificacion').ele('Tipo').txt(tipoIdEmisor).up().ele('Numero').txt(emisor.identificacion).up().up();
        nodoEmisor.up();

        if (request.receptor) {
            const nodoReceptor = doc.ele('Receptor');
            nodoReceptor.ele('Nombre').txt(request.receptor.nombre).up();
            nodoReceptor.ele('Identificacion').ele('Tipo').txt(request.receptor.tipoIdentificacion).up().ele('Numero').txt(request.receptor.identificacion).up().up();
            if (request.receptor.correoElectronico) {
                nodoReceptor.ele('CorreoElectronico').txt(request.receptor.correoElectronico).up();
            }
            nodoReceptor.up();
        }

        doc.ele('CondicionVenta').txt(request.condicionVenta).up();
        if (request.plazoCredito) {
            doc.ele('PlazoCredito').txt(request.plazoCredito.toString()).up();
        }
        for (const medio of request.medioPago) {
            doc.ele('MedioPago').txt(medio).up();
        }

        const nodoDetalle = doc.ele('DetalleServicio');
        request.lineasDetalle.forEach((linea, index) => {
            const l = nodoDetalle.ele('LineaDetalle');
            l.ele('NumeroLinea').txt((index + 1).toString()).up()
                .ele('Codigo').txt(linea.codigoCabys).up()
                .ele('Cantidad').txt(linea.cantidad.toFixed(3)).up()
                .ele('UnidadMedida').txt(linea.unidadMedida).up()
                .ele('Detalle').txt(linea.detalle).up()
                .ele('PrecioUnitario').txt(linea.precioUnitario.toFixed(5)).up()
                .ele('MontoTotal').txt(linea.montoTotal.toFixed(5)).up()
                .ele('SubTotal').txt(linea.subTotal.toFixed(5)).up();

            if (linea.descuento) {
                l.ele('Descuento').ele('MontoDescuento').txt(linea.descuento.monto.toFixed(5)).up().ele('NaturalezaDescuento').txt(linea.descuento.naturaleza).up().up();
            }

            if (linea.impuestos && linea.impuestos.length > 0) {
                linea.impuestos.forEach((imp) => {
                    l.ele('Impuesto').ele('Codigo').txt(imp.codigo).up().ele('CodigoTarifa').txt(imp.codigoTarifa).up().ele('Tarifa').txt(imp.tarifa.toFixed(2)).up().ele('Monto').txt(imp.monto.toFixed(5)).up().up();
                });
                l.ele('ImpuestoNeto').txt(linea.impuestoNeto?.toFixed(5) || '0.00000').up();
            }
            l.ele('MontoTotalLinea').txt(linea.montoTotalLinea.toFixed(5)).up();
            l.up();
        });
        nodoDetalle.up();

        const r = doc.ele('ResumenFactura');
        r.ele('CodigoTipoMoneda').ele('CodigoMoneda').txt(request.resumenFactura.codigoMoneda).up().ele('TipoCambio').txt((request.resumenFactura.tipoCambio || 1).toFixed(5)).up().up()
            .ele('TotalServGravados').txt(request.resumenFactura.totalServGravados.toFixed(5)).up()
            .ele('TotalServExentos').txt(request.resumenFactura.totalServExentos.toFixed(5)).up()
            .ele('TotalServExonerados').txt(request.resumenFactura.totalServExonerados.toFixed(5)).up()
            .ele('TotalMercanciasGravadas').txt(request.resumenFactura.totalMercanciasGravadas.toFixed(5)).up()
            .ele('TotalMercanciasExentas').txt(request.resumenFactura.totalMercanciasExentas.toFixed(5)).up()
            .ele('TotalMercanciasExoneradas').txt(request.resumenFactura.totalMercanciasExonerados.toFixed(5)).up()
            .ele('TotalGravado').txt(request.resumenFactura.totalGravado.toFixed(5)).up()
            .ele('TotalExento').txt(request.resumenFactura.totalExento.toFixed(5)).up()
            .ele('TotalExonerado').txt(request.resumenFactura.totalExonerado.toFixed(5)).up()
            .ele('TotalVenta').txt(request.resumenFactura.totalVenta.toFixed(5)).up()
            .ele('TotalDescuentos').txt(request.resumenFactura.totalDescuentos.toFixed(5)).up()
            .ele('TotalVentaNeta').txt(request.resumenFactura.totalVentaNeta.toFixed(5)).up()
            .ele('TotalImpuesto').txt(request.resumenFactura.totalImpuesto.toFixed(5)).up()
            .ele('TotalComprobante').txt(request.resumenFactura.totalComprobante.toFixed(5)).up();
        r.up();

        if (request.referencias && request.referencias.length > 0) {
            request.referencias.forEach((ref) => {
                doc.ele('InformacionReferencia')
                    .ele('TipoDoc').txt(ref.tipoDocumento).up()
                    .ele('Numero').txt(ref.numeroDocumento).up()
                    .ele('FechaEmision').txt(ref.fechaEmision).up()
                    .ele('Codigo').txt(ref.codigo).up()
                    .ele('Razon').txt(ref.razon).up()
                    .up();
            });
        }

        const xmlString = doc.end({ prettyPrint: true });
        return { xml: xmlString, clave, consecutivo };
    }

    /**
     * Genera XML para Mensaje de Receptor (05, 06, 07)
     */
    static generarMensajeReceptorXML(
        msg: MensajeReceptorRequest,
        consecutivoReal: number,
        sucursal: number,
        caja: number
    ): { xml: string; clave: string; consecutivo: string } {
        // Tipo de mensaje a tipo de comprobante para el consecutivo: 
        // 1 (Aceptado) -> 05
        // 2 (Parcial) -> 06
        // 3 (Rechazo) -> 07
        const tipoComp = msg.mensaje === '1' ? '05' : msg.mensaje === '2' ? '06' : '07';
        const consecutivo = HaciendaUtils.generarConsecutivo(sucursal, caja, tipoComp, consecutivoReal);

        // Clave del mensaje receptor (Se usa la cédula del receptor, o sea nuestra empresa, porque somos los emisores del mensaje)
        const clave = HaciendaUtils.generarClave(msg.numeroCedulaReceptor, consecutivo, '1');

        const doc = create({ version: '1.0', encoding: 'utf-8' })
            .ele('MensajeReceptor', {
                xmlns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/mensajeReceptor',
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
            });

        doc.ele('Clave').txt(msg.claveExterno).up()
            .ele('NumeroCedulaEmisor').txt(msg.numeroCedulaEmisor).up()
            .ele('FechaEmisionDoc').txt(msg.fechaEmisionDoc).up()
            .ele('Mensaje').txt(msg.mensaje).up();

        if (msg.detalleMensaje) doc.ele('DetalleMensaje').txt(msg.detalleMensaje).up();

        if (msg.montoTotalImpuesto !== undefined) {
            doc.ele('MontoTotalImpuesto').txt(msg.montoTotalImpuesto.toFixed(5)).up();
        }

        if (msg.condicionImpuesto) {
            doc.ele('CondicionImpuesto').txt(msg.condicionImpuesto).up();
        }

        doc.ele('TotalFactura').txt(msg.totalFactura.toFixed(5)).up()
            .ele('NumeroCedulaReceptor').txt(msg.numeroCedulaReceptor).up()
            .ele('NumeroConsecutivoReceptor').txt(consecutivo).up();

        const xmlString = doc.end({ prettyPrint: true });
        return { xml: xmlString, clave, consecutivo };
    }
}
