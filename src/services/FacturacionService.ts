import { CreacionFacturaRequest, MensajeReceptorRequest } from '../models/FacturaTypes';
import { HaciendaXmlGenerator } from '../utils/HaciendaXmlGenerator';
import { HaciendaSigner } from '../utils/HaciendaSigner';
import { HaciendaAuthService } from '../utils/HaciendaAuthService';
import axios from 'axios';
import admin from '../utils/firebaseAdmin';
import { PdfGeneratorService } from '../utils/PdfGeneratorService';
import prisma from '../utils/prismaClient';

export class FacturacionService {

    /**
     * Procesa la solicitud completa de un FrontEnd o POS para emitir una factura electrónica.
     * Guarda temporalmente en BD para respaldo e intenta enviar a Hacienda.
     */
    static async emitirFacturaElectronica(
        emisorId: string,
        request: CreacionFacturaRequest,
        tipoDocumento: '01' | '02' | '03' | '04' = '01'
    ): Promise<{ status: number; message: string; clave: string; documentoId: string }> {

        // 1. Validar al emisor en base de datos
        const emisor = await prisma.emisorCredenciales.findUnique({
            where: { id: emisorId }
        });

        if (!emisor) {
            throw new Error('Emisor no encontrado o sin credenciales válidas');
        }

        if (!emisor.codigoActividad || emisor.codigoActividad.trim().length !== 6) {
            throw new Error('El emisor no tiene un código de actividad económico válido (6 dígitos) configurado. Por favor, actualice la configuración en el panel.');
        }

        // 2. Incrementar el consecutivo interno de forma atómica según el tipo de documento
        let updateData: any = {};
        switch (tipoDocumento) {
            case '01': updateData = { consecutivoFe: { increment: 1 } }; break;
            case '02': updateData = { consecutivoNd: { increment: 1 } }; break;
            case '03': updateData = { consecutivoNc: { increment: 1 } }; break;
            case '04': updateData = { consecutivoTe: { increment: 1 } }; break;
        }

        const emisorActualizado = await prisma.emisorCredenciales.update({
            where: { id: emisorId },
            data: updateData
        });

        const consecutivoReal = 
            tipoDocumento === '01' ? emisorActualizado.consecutivoFe :
            tipoDocumento === '02' ? emisorActualizado.consecutivoNd :
            tipoDocumento === '03' ? emisorActualizado.consecutivoNc :
            emisorActualizado.consecutivoTe;

        // 3. Generar Clave y XML crudo (Sin firmar)
        const { clave, consecutivo, xml } = HaciendaXmlGenerator.generarComprobanteXML(request, emisor, consecutivoReal, tipoDocumento);

        const documentoBD = await prisma.documentoElectronico.create({
            data: {
                emisorId: emisor.id,
                claveNumerica: clave,
                numeroConsecutivo: consecutivo,
                tipoDocumento: tipoDocumento,
                montoTotal: request.resumenFactura.totalComprobante,
                estadoInterno: 'CREADO',
                xmlAlmacen: {
                    create: { xmlGenerado: xml }
                },
                logs: {
                    create: [
                        { accion: 'Generación inicial del XML 4.3' },
                        { accion: 'DATOS_RECEPTOR', resultadoJson: request.receptor?.correoElectronico || 'SIN_CORREO' }
                    ]
                }
            }
        });

        // 4. Generar PDF y almacenarlo en Firebase Storage
        try {
            const pdfBuffer = await PdfGeneratorService.generarFacturaPDF(request, emisor, clave, consecutivo, tipoDocumento);

            const bucket = admin.storage().bucket();
            const file = bucket.file(`pdfs/${clave}.pdf`);
            await file.save(pdfBuffer, {
                metadata: { contentType: 'application/pdf' }
            });
            await file.makePublic();
            const pdfUrl = file.publicUrl();

            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { pdfUrl: pdfUrl }
            });
        } catch (pdfErr: any) {
            console.error('Error subiendo PDF a Firebase Storage, omitiendo falla no crítica...', pdfErr.message);
        }

        // ==========================================
        // FASE DE FIRMA Y ENVÍO A HACIENDA
        // ==========================================

        try {
            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { estadoInterno: 'FIRMANDO' }
            });

            if (!emisor.certificadoP12 || !emisor.pinCertificado) {
                throw new Error('No hay .p12 configurado para firmar. Configure el certificado en Ajustes.');
            }

            // 5. Firma Digital Criptográfica (XAdES-EPES)
            // pinCertificado viene cifrado de la BD; HaciendaSigner lo descifra internamente.
            const xmlFirmado = await HaciendaSigner.firmarXML(xml, emisor.certificadoP12, emisor.pinCertificado);

            await prisma.xmlAlmacen.update({
                where: { documentoId: documentoBD.id },
                data: { xmlFirmado: xmlFirmado }
            });

            // 6. Obtener Token de ATV (passwordAtv viene cifrado; HaciendaAuthService lo descifra)
            const tokenAtv = await HaciendaAuthService.obtenerToken(emisor.usuarioAtv, emisor.passwordAtv);

            // 7. Preparar payload oficial de Recepción
            const payloadHacienda = {
                clave: clave,
                fecha: new Date().toISOString(),
                emisor: {
                    tipoIdentificacion: emisor.identificacion.length === 9 ? '01' : '02',
                    numeroIdentificacion: emisor.identificacion
                },
                receptor: request.receptor ? {
                    tipoIdentificacion: request.receptor.tipoIdentificacion,
                    numeroIdentificacion: request.receptor.identificacion
                } : undefined,
                comprobanteXml: xmlFirmado
            };

            // 8. Registrar intento y enviar
            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { intentosEnvio: { increment: 1 }, estadoInterno: 'ENVIADO' }
            });

            const urlRecepcion = process.env.HACIENDA_API_URL || 'https://api.hacienda.go.cr/fe/recepcion';

            const responseHacienda = await axios.post(urlRecepcion, payloadHacienda, {
                headers: {
                    'Authorization': `Bearer ${tokenAtv}`,
                    'Content-Type': 'application/json'
                }
            });

            // [FUNC-01] 202 Accepted = Hacienda lo recibió en cola de verificación
            if (responseHacienda.status === 202) {
                await prisma.logsTransaccion.create({
                    data: {
                        documentoId: documentoBD.id,
                        accion: 'Envío exitoso a Hacienda (Status 202)',
                        resultadoJson: JSON.stringify(responseHacienda.headers)
                    }
                });

                return {
                    status: 202,
                    message: 'El documento fue recibido por Hacienda y está en cola de procesamiento',
                    clave: clave,
                    documentoId: documentoBD.id
                };
            } else {
                // [FUNC-01] Manejar status inesperado de Hacienda explícitamente
                throw new Error(`Hacienda retornó status inesperado: ${responseHacienda.status}. Body: ${JSON.stringify(responseHacienda.data)}`);
            }

        } catch (error: any) {
            // Determinar si es un fallo temporal de red / timeout / servidor caído
            const esErrorTemporalDeRed = !error.response || (error.response.status >= 500 && error.response.status <= 599);

            // Obtener el estado actual en base de datos para no pisarlo
            const docActual = await prisma.documentoElectronico.findUnique({
                where: { id: documentoBD.id },
                select: { estadoInterno: true }
            });

            const nuevoEstado = (esErrorTemporalDeRed && docActual?.estadoInterno === 'ENVIADO') 
                ? 'ENVIADO' 
                : 'RECHAZADO';

            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { estadoInterno: nuevoEstado }
            });

            await prisma.logsTransaccion.create({
                data: {
                    documentoId: documentoBD.id,
                    accion: esErrorTemporalDeRed ? 'Fallo temporal de conexión (mantiene ENVIADO)' : 'Fallo definitivo en fase de envío',
                    resultadoJson: error.response?.data ? JSON.stringify(error.response.data) : error.message
                }
            });

            throw new Error(`Error en fase de envío: ${error.message}`);
        }
    }

    /**
     * Procesa la solicitud completa para emitir un Mensaje de Receptor (05, 06, 07)
     * para facturas de compras recibidas de proveedores.
     */
    static async emitirMensajeReceptor(
        emisorId: string,
        request: MensajeReceptorRequest
    ): Promise<{ status: number; message: string; clave: string; documentoId: string }> {

        // 1. Validar emisor
        const emisor = await prisma.emisorCredenciales.findUnique({
            where: { id: emisorId }
        });

        if (!emisor) {
            throw new Error('Emisor no encontrado o sin credenciales válidas');
        }

        // 2. Incrementar el consecutivo interno según el tipo de mensaje
        // 1 (Aceptado) -> consecutivoCpce -> Tipo de documento '05'
        // 2 (Aceptado Parcial) -> consecutivoCpce -> Tipo de documento '06'
        // 3 (Rechazo) -> consecutivoRce -> Tipo de documento '07'
        const tipoDocumento = request.mensaje === '1' ? '05' : request.mensaje === '2' ? '06' : '07';
        
        let updateData: any = {};
        if (tipoDocumento === '05' || tipoDocumento === '06') {
            updateData = { consecutivoCpce: { increment: 1 } };
        } else {
            updateData = { consecutivoRce: { increment: 1 } };
        }

        const emisorActualizado = await prisma.emisorCredenciales.update({
            where: { id: emisorId },
            data: updateData
        });

        const consecutivoReal = tipoDocumento === '07' 
            ? emisorActualizado.consecutivoRce 
            : emisorActualizado.consecutivoCpce;

        // 3. Generar XML crudo
        // Suponemos sucursal 1 caja 1 por defecto para recepciones si no se provee
        const sucursal = 1;
        const caja = 1;
        
        const { xml, clave, consecutivo } = HaciendaXmlGenerator.generarMensajeReceptorXML(
            request,
            consecutivoReal,
            sucursal,
            caja
        );

        // 4. Guardar en Base de Datos
        const documentoBD = await prisma.documentoElectronico.create({
            data: {
                emisorId: emisor.id,
                claveNumerica: clave,
                numeroConsecutivo: consecutivo,
                tipoDocumento: tipoDocumento,
                montoTotal: request.totalFactura,
                estadoInterno: 'CREADO',
                xmlAlmacen: {
                    create: { xmlGenerado: xml }
                },
                logs: {
                    create: [
                        { accion: 'Generación inicial del XML Mensaje Receptor 4.3' },
                        { accion: 'DATOS_PROVEEDOR', resultadoJson: JSON.stringify({ emisor: request.numeroCedulaEmisor, receptor: request.numeroCedulaReceptor }) }
                    ]
                }
            }
        });

        // 5. Firma y Envío
        try {
            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { estadoInterno: 'FIRMANDO' }
            });

            if (!emisor.certificadoP12 || !emisor.pinCertificado) {
                throw new Error('No hay .p12 configurado para firmar. Configure el certificado en Ajustes.');
            }

            // Firmar criptográficamente (pinCertificado viene cifrado, HaciendaSigner lo descifra)
            const xmlFirmado = await HaciendaSigner.firmarXML(xml, emisor.certificadoP12, emisor.pinCertificado);

            await prisma.xmlAlmacen.update({
                where: { documentoId: documentoBD.id },
                data: { xmlFirmado: xmlFirmado }
            });

            // Obtener Token de ATV
            const tokenAtv = await HaciendaAuthService.obtenerToken(emisor.usuarioAtv, emisor.passwordAtv);

            // Preparar payload de Recepción Hacienda
            const payloadHacienda = {
                clave: clave,
                fecha: new Date().toISOString(),
                emisor: {
                    tipoIdentificacion: emisor.identificacion.length === 9 ? '01' : '02',
                    numeroIdentificacion: emisor.identificacion
                },
                receptor: {
                    tipoIdentificacion: request.numeroCedulaEmisor.length === 9 ? '01' : '02',
                    numeroIdentificacion: request.numeroCedulaEmisor
                },
                comprobanteXml: xmlFirmado
            };

            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { intentosEnvio: { increment: 1 }, estadoInterno: 'ENVIADO' }
            });

            const urlRecepcion = process.env.HACIENDA_API_URL || 'https://api.hacienda.go.cr/fe/recepcion';

            const responseHacienda = await axios.post(urlRecepcion, payloadHacienda, {
                headers: {
                    'Authorization': `Bearer ${tokenAtv}`,
                    'Content-Type': 'application/json'
                }
            });

            if (responseHacienda.status === 202) {
                await prisma.logsTransaccion.create({
                    data: {
                        documentoId: documentoBD.id,
                        accion: 'Envío de Mensaje Receptor exitoso a Hacienda (Status 202)',
                        resultadoJson: JSON.stringify(responseHacienda.headers)
                    }
                });

                return {
                    status: 202,
                    message: 'El mensaje de receptor fue recibido por Hacienda y está en cola de procesamiento',
                    clave: clave,
                    documentoId: documentoBD.id
                };
            } else {
                throw new Error(`Hacienda retornó status inesperado: ${responseHacienda.status}`);
            }

        } catch (error: any) {
            const esErrorTemporalDeRed = !error.response || (error.response.status >= 500 && error.response.status <= 599);

            const docActual = await prisma.documentoElectronico.findUnique({
                where: { id: documentoBD.id },
                select: { estadoInterno: true }
            });

            const nuevoEstado = (esErrorTemporalDeRed && docActual?.estadoInterno === 'ENVIADO') 
                ? 'ENVIADO' 
                : 'RECHAZADO';

            await prisma.documentoElectronico.update({
                where: { id: documentoBD.id },
                data: { estadoInterno: nuevoEstado }
            });

            await prisma.logsTransaccion.create({
                data: {
                    documentoId: documentoBD.id,
                    accion: esErrorTemporalDeRed ? 'Fallo temporal de conexión en Mensaje Receptor (mantiene ENVIADO)' : 'Fallo definitivo en fase de envío de Mensaje Receptor',
                    resultadoJson: error.response?.data ? JSON.stringify(error.response.data) : error.message
                }
            });

            throw new Error(`Error en fase de envío de Mensaje Receptor: ${error.message}`);
        }
    }
}
