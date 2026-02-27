import { PrismaClient } from '@prisma/client';
import { CreacionFacturaRequest } from '../models/FacturaTypes';
import { HaciendaXmlGenerator } from '../utils/HaciendaXmlGenerator';
import { HaciendaSigner } from '../utils/HaciendaSigner';
import { HaciendaAuthService } from '../utils/HaciendaAuthService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PdfGeneratorService } from '../utils/PdfGeneratorService';

const prisma = new PrismaClient();

export class FacturacionService {

    /**
     * Procesa la solicitud completa de un FrontEnd o POS para emitir una factura electrónica.
     * Guarda temporalmente en BD para respaldo e intenta enviar a Hacienda.
     */
    static async emitirFacturaElectronica(emisorId: string, request: CreacionFacturaRequest) {
        try {
            // 1. Validar al emisor en base de datos
            const emisor = await prisma.emisorCredenciales.findUnique({
                where: { id: emisorId }
            });

            if (!emisor) {
                throw new Error('Emisor no encontrado o sin credenciales válidas');
            }

            // 2. Incrementar el consecutivo interno de forma segura (Transacción recomendada para alta concurrencia)
            const emisorActualizado = await prisma.emisorCredenciales.update({
                where: { id: emisorId },
                data: { consecutivoFe: { increment: 1 } }
            });

            const consecutivoReal = emisorActualizado.consecutivoFe;

            // 3. Generar Clave y XML crudo (Sin firmar)
            const { clave, consecutivo, xml } = HaciendaXmlGenerator.generarComprobanteXML(request, emisor, consecutivoReal, '01');

            const documentoBD = await prisma.documentoElectronico.create({
                data: {
                    emisorId: emisor.id,
                    claveNumerica: clave,
                    numeroConsecutivo: consecutivo,
                    tipoDocumento: '01',
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

            // 4.5 Generar PDF y almacenarlo localmente (Carpeta temporal o estática)
            try {
                const pdfBuffer = await PdfGeneratorService.generarFacturaPDF(request, emisor, clave, consecutivo, '01');
                const pdfDir = path.join(__dirname, '../../public/pdfs');
                if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

                const pdfPath = path.join(pdfDir, `${clave}.pdf`);
                fs.writeFileSync(pdfPath, pdfBuffer);

                // Actualizar DB con el URL Local del PDF
                await prisma.documentoElectronico.update({
                    where: { id: documentoBD.id },
                    data: { pdfUrl: `/pdfs/${clave}.pdf` }
                });
            } catch (pdfErr: any) {
                console.error("Error generando PDF preliminar, omitiendo falla no crítica...", pdfErr.message);
            }

            // ==========================================
            // FASE ASÍNCRONA O ALTO RENDIMIENTO (Recomendado encolar aquí en un Job)
            // ==========================================

            try {
                await prisma.documentoElectronico.update({
                    where: { id: documentoBD.id },
                    data: { estadoInterno: 'FIRMANDO' }
                });

                if (!emisor.certificadoP12 || !emisor.pinCertificado) {
                    throw new Error("No hay .p12 configurado para firmar");
                }

                // 5. Firma Digital Criptográfica (XAdES-EPES)
                const xmlFirmado = await HaciendaSigner.firmarXML(xml, emisor.certificadoP12, emisor.pinCertificado);

                await prisma.xmlAlmacen.update({
                    where: { documentoId: documentoBD.id },
                    data: { xmlFirmado: xmlFirmado }
                });

                // 6. Obtener Token de ATV
                const tokenAtv = await HaciendaAuthService.obtenerToken(emisor.usuarioAtv, emisor.passwordAtv);

                // 7. Preparar payload oficial de Recepción
                const payloadHacienda = {
                    clave: clave,
                    fecha: new Date().toISOString(),
                    emisor: {
                        tipoIdentificacion: emisor.identificacion.length === 9 ? '01' : '02',
                        numeroIdentificacion: emisor.identificacion
                    },
                    // Si hay receptor, inyectarlo (obligatorio en FE si la venta supera cierto monto)
                    receptor: request.receptor ? {
                        tipoIdentificacion: request.receptor.tipoIdentificacion,
                        numeroIdentificacion: request.receptor.identificacion
                    } : undefined,
                    comprobanteXml: xmlFirmado // Tiene que ir en Base64 oficial de la firma
                };

                // 8. Enviar Petición
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

                // 202 Accepted significa que Hacienda lo recibió y lo puso en VERIFICACIÓN.
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
                }

            } catch (error: any) {
                // Fallo en la fase asíncrona: Registrar en la bitácora para que el retry/DLQ lo intente luego
                await prisma.logsTransaccion.create({
                    data: {
                        documentoId: documentoBD.id,
                        accion: 'Fallo al firmar o enviar',
                        resultadoJson: error.response?.data ? JSON.stringify(error.response.data) : error.message
                    }
                });

                throw new Error(`Error en fase de envío: ${error.message}`);
            }

        } catch (globalError: any) {
            console.error(globalError);
            throw globalError;
        }
    }
}
