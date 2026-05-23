import { Request, Response } from 'express';
import { FacturacionService } from '../services/FacturacionService';
import { CreacionFacturaRequest, MensajeReceptorRequest } from '../models/FacturaTypes';
import { FacturaSchema } from '../validators/facturaSchema';
import { MensajeReceptorSchema } from '../validators/mensajeReceptorSchema';
import prisma from '../utils/prismaClient';
import axios from 'axios';
import { HaciendaAuthService } from '../utils/HaciendaAuthService';
import { EmailNotificationService } from '../utils/EmailNotificationService';
import admin from '../utils/firebaseAdmin';

export class FacturacionController {

    /**
     * Endpoint: POST /api/facturas/emitir
     * Body: { factura: CreacionFacturaRequest }
     */
    static async emitirFactura(req: Request, res: Response) {
        try {
            const emisorId = req.user!.uid;
            const { factura } = req.body;

            if (!factura) {
                return res.status(400).json({ error: 'Parámetros inválidos. Requiere objeto factura.' });
            }

            // [VAL-01] Validación de schema con Zod antes de procesar
            const validation = FacturaSchema.safeParse(factura);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Payload de factura inválido',
                    detalle: validation.error.flatten()
                });
            }

            const resultadoRespuesta = await FacturacionService.emitirFacturaElectronica(emisorId, validation.data as CreacionFacturaRequest);

            return res.status(202).json({
                message: 'Comprobante electrónico procesado exitosamente hacia el Ministerio de Hacienda',
                data: resultadoRespuesta
            });

        } catch (error: any) {
            console.error('Error Controller - EmitirFactura:', error);
            return res.status(500).json({
                error: 'Ocurrió un problema interno procesando la factura',
                detalle: error.message || error.toString()
            });
        }
    }

    /**
     * Endpoint: GET /api/facturas/:clave/pdf
     * Redirige al PDF en Firebase Storage.
     * [SEC-02] Verifica que el documento pertenece al emisor autenticado.
     */
    static async descargarPDF(req: Request, res: Response) {
        try {
            const clave = req.params.clave as string;
            const emisorId = req.user!.uid;

            if (!clave) {
                return res.status(400).json({ error: 'La clave numérica es obligatoria.' });
            }

            const doc = await prisma.documentoElectronico.findUnique({
                where: { claveNumerica: clave },
                select: { pdfUrl: true, emisorId: true }
            });

            if (!doc) {
                return res.status(404).json({ error: 'Comprobante no encontrado.' });
            }

            // [SEC-02] Tenant isolation: verificar ownership
            if (doc.emisorId !== emisorId) {
                return res.status(403).json({ error: 'Acceso denegado: este comprobante no pertenece a tu cuenta.' });
            }

            if (!doc.pdfUrl) {
                return res.status(404).json({ error: 'El PDF no está disponible. No se generó o no existe el comprobante en la nube.' });
            }

            // El frontend o usuario descargará directamente desde Firebase Storage
            return res.redirect(doc.pdfUrl);
        } catch (error: any) {
            return res.status(500).json({ error: 'Error procesando la descarga', detalle: error.message });
        }
    }

    /**
     * Endpoint: GET /api/facturas/:clave/xml
     * Descarga el XML firmado del comprobante electrónico.
     * [SEC-02] Verifica que el documento pertenece al emisor autenticado.
     */
    static async descargarXML(req: Request, res: Response) {
        try {
            const clave = req.params.clave as string;
            const emisorId = req.user!.uid;

            if (!clave) {
                return res.status(400).json({ error: 'La clave numérica es obligatoria.' });
            }

            const doc: any = await prisma.documentoElectronico.findUnique({
                where: { claveNumerica: clave },
                include: { xmlAlmacen: true }
            });

            if (!doc) {
                return res.status(404).json({ error: 'Comprobante no encontrado.' });
            }

            // [SEC-02] Tenant isolation: verificar ownership
            if (doc.emisorId !== emisorId) {
                return res.status(403).json({ error: 'Acceso denegado: este comprobante no pertenece a tu cuenta.' });
            }

            if (!doc.xmlAlmacen?.xmlFirmado) {
                return res.status(404).json({ error: 'El XML firmado no está disponible para esta clave.' });
            }

            res.setHeader('Content-disposition', `attachment; filename=Factura_${clave}.xml`);
            res.setHeader('Content-type', 'application/xml');
            return res.send(doc.xmlAlmacen.xmlFirmado);
        } catch (error: any) {
            return res.status(500).json({ error: 'Error procesando la descarga del XML', detalle: error.message });
        }
    }

    /**
     * Endpoint: GET /api/facturas
     * Lista el historial de facturas del emisor con paginación.
     * [OPS-04] Soporta query params: page (default 1), limit (default 20, max 100)
     */
    static async listarFacturas(req: Request, res: Response) {
        try {
            const emisorId = req.user!.uid;

            // [OPS-04] Paginación
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
            const skip = (page - 1) * limit;

            const [documentos, total] = await Promise.all([
                prisma.documentoElectronico.findMany({
                    where: { emisorId },
                    orderBy: { fechaEmision: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.documentoElectronico.count({ where: { emisorId } })
            ]);

            return res.json({
                data: documentos,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error: any) {
            console.error('Error Controller - ListarFacturas:', error);
            return res.status(500).json({ error: 'Error al listar las facturas', detalle: error.message });
        }
    }

    /**
     * Endpoint: POST /api/facturas/tiquete/emitir
     */
    static async emitirTiquete(req: Request, res: Response) {
        return FacturacionController.procesarDocumento(req, res, '04');
    }

    /**
     * Endpoint: POST /api/facturas/nota-credito/emitir
     */
    static async emitirNotaCredito(req: Request, res: Response) {
        return FacturacionController.procesarDocumento(req, res, '03');
    }

    /**
     * Endpoint: POST /api/facturas/nota-debito/emitir
     */
    static async emitirNotaDebito(req: Request, res: Response) {
        return FacturacionController.procesarDocumento(req, res, '02');
    }

    private static async procesarDocumento(req: Request, res: Response, tipoDocumento: '01' | '02' | '03' | '04') {
        try {
            const emisorId = req.user!.uid;
            const { factura } = req.body;
            if (!factura) {
                return res.status(400).json({ error: 'Parámetros inválidos. Requiere objeto factura.' });
            }

            // [VAL-01] Validación Zod
            const validation = FacturaSchema.safeParse(factura);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Payload de factura inválido',
                    detalle: validation.error.flatten()
                });
            }

            const resultadoRespuesta = await FacturacionService.emitirFacturaElectronica(emisorId, validation.data as CreacionFacturaRequest, tipoDocumento);

            return res.status(202).json({
                message: 'Comprobante electrónico procesado exitosamente',
                data: resultadoRespuesta
            });
        } catch (error: any) {
            console.error(`Error Controller - procesarDocumento [${tipoDocumento}]:`, error);
            return res.status(500).json({
                error: 'Ocurrió un problema interno procesando el documento',
                detalle: error.message || error.toString()
            });
        }
    }

    /**
     * Endpoint: GET /api/facturas/:clave/estado
     * Consulta el estado de un comprobante ante Hacienda en tiempo real.
     */
    static async consultarEstadoRealTime(req: Request, res: Response) {
        try {
            const clave = req.params.clave as string;
            const emisorId = req.user!.uid;

            if (!clave) {
                return res.status(400).json({ error: 'La clave numérica es obligatoria.' });
            }

            const doc = await prisma.documentoElectronico.findUnique({
                where: { claveNumerica: clave },
                include: { emisor: true, xmlAlmacen: true, logs: true }
            });

            if (!doc) {
                return res.status(404).json({ error: 'Comprobante no encontrado.' });
            }

            // Tenant isolation
            if (doc.emisorId !== emisorId) {
                return res.status(403).json({ error: 'Acceso denegado: este comprobante no pertenece a tu cuenta.' });
            }

            // Si ya está aceptado o rechazado de forma definitiva, lo devolvemos tal cual para no saturar a Hacienda
            if (doc.estadoInterno === 'ACEPTADO' || doc.estadoInterno === 'RECHAZADO') {
                return res.json({
                    clave: doc.claveNumerica,
                    estadoInterno: doc.estadoInterno,
                    mensaje: 'Comprobante ya finalizado anteriormente.'
                });
            }

            // Obtener token ATV de Hacienda
            const token = await HaciendaAuthService.obtenerToken(doc.emisor.usuarioAtv, doc.emisor.passwordAtv);
            const baseUrl = process.env.HACIENDA_API_URL || 'https://api.hacienda.go.cr/fe/recepcion';
            const urlConsulta = `${baseUrl}/${doc.claveNumerica}`;

            const respuesta = await axios.get(urlConsulta, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const estadoHacienda = respuesta.data['ind-estado'];
            const xmlRespuestaB64 = respuesta.data['respuesta-xml'];

            if (estadoHacienda === 'aceptado' || estadoHacienda === 'rechazado') {
                const nuevoEstadoStr = estadoHacienda.toUpperCase();

                // Actualizar de forma transaccional en DB
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
                            accion: `Consulta Real Time - Resolución Ministerio: ${nuevoEstadoStr}`,
                            resultadoJson: JSON.stringify(respuesta.data)
                        }
                    })
                ]);

                // Disparar correo asíncrono si corresponde (no bloquear respuesta)
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
                            console.error(`PDF no encontrado en Storage para real-time: ${e.message}`);
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

                        EmailNotificationService.enviarFacturaReceptor(
                            receptorEmail,
                            subject,
                            bodyHtml,
                            pdfBuffer,
                            xmlFirmadoData,
                            xmlRespuestaB64,
                            doc.claveNumerica || 'NO_CLAVE'
                        ).catch(err => console.error('Error enviando mail en real-time:', err));
                    }
                } catch (mailErr: any) {
                    console.error('Error procesando el envío de mail:', mailErr.message);
                }

                return res.json({
                    clave: doc.claveNumerica,
                    estadoInterno: nuevoEstadoStr,
                    detalleHacienda: respuesta.data
                });
            } else {
                // Incrementamos intentos de envio si es necesario
                await prisma.documentoElectronico.update({
                    where: { id: doc.id },
                    data: { intentosEnvio: { increment: 1 } }
                });

                return res.json({
                    clave: doc.claveNumerica,
                    estadoInterno: doc.estadoInterno,
                    estadoHacienda: estadoHacienda || 'procesando',
                    mensaje: 'El comprobante sigue siendo procesado internamente por el Ministerio de Hacienda.'
                });
            }

        } catch (error: any) {
            console.error('Error en FacturacionController - consultarEstadoRealTime:', error.message);
            return res.status(500).json({ error: 'Error al consultar estado en tiempo real', detalle: error.message });
        }
    }

    /**
     * Endpoint: POST /api/facturas/recepcion-compras
     * Body: { mensajeReceptor: MensajeReceptorRequest }
     */
    static async emitirMensajeReceptor(req: Request, res: Response) {
        try {
            const emisorId = req.user!.uid;
            const { mensajeReceptor } = req.body;

            if (!mensajeReceptor) {
                return res.status(400).json({ error: 'Parámetros inválidos. Se requiere objeto mensajeReceptor.' });
            }

            // Validación con Zod
            const validation = MensajeReceptorSchema.safeParse(mensajeReceptor);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Payload de Mensaje Receptor inválido',
                    detalle: validation.error.flatten()
                });
            }

            const resultadoRespuesta = await FacturacionService.emitirMensajeReceptor(emisorId, validation.data as any);

            return res.status(202).json({
                message: 'Mensaje de receptor procesado exitosamente hacia el Ministerio de Hacienda',
                data: resultadoRespuesta
            });

        } catch (error: any) {
            console.error('Error Controller - emitirMensajeReceptor:', error);
            return res.status(500).json({
                error: 'Ocurrió un problema interno procesando el mensaje de receptor',
                detalle: error.message || error.toString()
            });
        }
    }
}
