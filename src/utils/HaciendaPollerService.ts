import cron from 'node-cron';
import axios from 'axios';
import admin from './firebaseAdmin';
import { HaciendaAuthService } from './HaciendaAuthService';
import { EmailNotificationService } from './EmailNotificationService';
import prisma from './prismaClient';
import { logger } from './logger';

/**
 * Poller Background de Hacienda CR
 * Revisa documentos en estado ENVIADO (Máximo de 3 intentos para evitar bucles de Rechazo).
 * Actualiza la Base de datos con XML de Respuesta y Acuse de Recibo.
 */
export class HaciendaPollerService {

    /**
     * Inicia el trabajador Cronológico. Ejecuta la validación cada 2 minutos.
     */
    static start() {
        logger.info('✅ Poller de Hacienda Inicializado (Cron: */5 * * * *)');

        cron.schedule('*/5 * * * *', async () => {
            logger.info('⏳ Ejecutando revisión periódica de Comprobantes Pendientes...');
            await this.revisarPendientes();
        });
    }

    private static async revisarPendientes() {
        try {
            // [FUNC-04] Procesar máximo 10 documentos por ciclo para no bloquear el event loop
            const BATCH_SIZE = 10;
            const pendientes = await prisma.documentoElectronico.findMany({
                where: {
                    estadoInterno: 'ENVIADO',
                    intentosEnvio: { lt: 5 }
                },
                include: { emisor: true, xmlAlmacen: true, logs: true },
                take: BATCH_SIZE,
                orderBy: { fechaEmision: 'asc' } // Procesar los más antiguos primero
            });

            if (pendientes.length === 0) return;

            logger.info(`🔍 Procesando ${pendientes.length} de los documentos pendientes (batch de ${BATCH_SIZE}).`);

            // 2. Iterar sobre pendientes (En Producción alto volumen, se usan colas Batch)
            for (const doc of pendientes) {
                try {
                    const token = await HaciendaAuthService.obtenerToken(doc.emisor.usuarioAtv, doc.emisor.passwordAtv);
                    const baseUrl = process.env.HACIENDA_API_URL || 'https://api.hacienda.go.cr/fe/recepcion';
                    const urlConsulta = `${baseUrl}/${doc.claveNumerica}`;

                    const respuesta = await axios.get(urlConsulta, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    // Hacienda devuelve un estado de 'indeterminado', 'aceptado', 'rechazado'
                    const estadoHacienda = respuesta.data['ind-estado'];

                    if (estadoHacienda === 'aceptado' || estadoHacienda === 'rechazado') {

                        const nuevoEstadoStr = estadoHacienda.toUpperCase();
                        const xmlRespuestaB64 = respuesta.data['respuesta-xml'];

                        // 3. Actualizar la base de datos
                        await prisma.$transaction([
                            prisma.documentoElectronico.update({
                                where: { id: doc.id },
                                data: { estadoInterno: nuevoEstadoStr as any }
                            }),
                            prisma.xmlAlmacen.update({
                                where: { documentoId: doc.id },
                                data: { xmlRespuestaMh: xmlRespuestaB64 }
                            }),
                            prisma.logsTransaccion.create({
                                data: {
                                    documentoId: doc.id,
                                    accion: `Resolución Ministerio: ${nuevoEstadoStr}`,
                                    resultadoJson: JSON.stringify(respuesta.data)
                                }
                            })
                        ]);

                        logger.info(`✅ Documento ${doc.claveNumerica} finalizado con estado: ${nuevoEstadoStr}`);

                        // ==========================================
                        // FASE FINAL: Enviar correo electrónico
                        // ==========================================
                        try {
                            const logReceptor = doc.logs.find((l: any) => l.accion === 'DATOS_RECEPTOR');
                            const receptorEmail = logReceptor?.resultadoJson;

                            if (receptorEmail && receptorEmail !== 'SIN_CORREO') {
                                const bucket = admin.storage().bucket();
                                const file = bucket.file(`pdfs/${doc.claveNumerica}.pdf`);
                                let pdfBuffer: Buffer = Buffer.from('');
                                try {
                                    const [buffer] = await file.download();
                                    pdfBuffer = buffer;
                                } catch (e: any) {
                                    logger.error(`PDF no encontrado en Storage para envio por correo: ${e.message}`);
                                }

                                const xmlFirmadoData = doc.xmlAlmacen?.xmlFirmado || '';
                                const subject = nuevoEstadoStr === 'ACEPTADO'
                                    ? `Factura Electrónica ${doc.claveNumerica}`
                                    : `⚠️ Comprobante Rechazado por Hacienda ${doc.claveNumerica}`;

                                const bodyHtml = `
                                    <h2>${doc.emisor.nombre}</h2>
                                    <p>Adjunto encontrará la factura electrónica ${doc.claveNumerica}.</p>
                                    <p>Estado en Ministerio de Hacienda: <strong>${nuevoEstadoStr}</strong></p>
                                `;

                                await EmailNotificationService.enviarFacturaReceptor(
                                    receptorEmail,
                                    subject,
                                    bodyHtml,
                                    pdfBuffer,
                                    xmlFirmadoData,
                                    xmlRespuestaB64,
                                    doc.claveNumerica || 'NO_CLAVE'
                                );
                            }
                        } catch (mailError: any) {
                            logger.error(`⚠️ Documento actualizado pero el correo falló: ${mailError.message}`);
                        }
                    } else {
                        // Si está 'procesando' o similar, solo registramos intento.
                        await prisma.documentoElectronico.update({
                            where: { id: doc.id },
                            data: { intentosEnvio: { increment: 1 } }
                        });
                        logger.info(`⏱️ Documento ${doc.claveNumerica} sigue en procesamiento interno en Hacienda.`);
                    }

                } catch (error: any) {
                    // Fallo al consultar (Ej. 404 por clave no encontrada aún)
                    logger.error(`❌ Error consultando comprobante ${doc.claveNumerica}: ${error.message}`);

                    const nuevoIntentos = doc.intentosEnvio + 1;
                    const statusUpdates: any = { intentosEnvio: { increment: 1 } };
                    
                    // Si ya superó el máximo de intentos, marcar como RECHAZADO
                    if (nuevoIntentos >= 5) {
                        statusUpdates.estadoInterno = 'RECHAZADO';
                    }

                    await prisma.documentoElectronico.update({
                        where: { id: doc.id },
                        data: statusUpdates
                    });

                    await prisma.logsTransaccion.create({
                        data: {
                            documentoId: doc.id,
                            accion: 'Intento Fallido de Consulta',
                            resultadoJson: error.response?.data ? JSON.stringify(error.response.data) : error.message
                        }
                    });
                }
            }

        } catch (globalError: any) {
            logger.error(`CRITICAL: Error maestro ejecutando el Poller de Hacienda: ${globalError.message || globalError}`);
        }
    }
}
