import { Request, Response } from 'express';
import { FacturacionService } from '../services/FacturacionService';
import { CreacionFacturaRequest } from '../models/FacturaTypes';
import prisma from '../utils/prismaClient';

export class FacturacionController {

    /**
     * Endpoint: POST /api/facturas/emitir
     * Body: { emisorId: "uuid", factura: CreacionFacturaRequest }
     */
    static async emitirFactura(req: Request, res: Response) {
        try {
            const { emisorId, factura } = req.body;

            if (!emisorId || !factura) {
                return res.status(400).json({ error: 'Parámetros inválidos. Requiere emisorId y objeto factura.' });
            }

            // Validar tipos numéricos, si no Express los recibe como Strings
            const parsedFactura = factura as CreacionFacturaRequest;

            // Iniciar orquestación del flujo de Hacienda
            const resultadoRespuesta = await FacturacionService.emitirFacturaElectronica(emisorId, parsedFactura);

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
     * Descarga la representación gráfica del comprobante electrónico.
     */
    static async descargarPDF(req: Request, res: Response) {
        try {
            const { clave } = req.params;
            if (!clave) {
                return res.status(400).json({ error: 'La clave numérica es obligatoria.' });
            }

            const fs = require('fs');
            const path = require('path');

            const pdfPath = path.join(__dirname, '../../public/pdfs', `${clave}.pdf`);

            if (!fs.existsSync(pdfPath)) {
                return res.status(404).json({ error: 'El PDF no está disponible. No se generó o no existe el comprobante.' });
            }

            return res.download(pdfPath, `Factura_${clave}.pdf`);
        } catch (error: any) {
            return res.status(500).json({ error: 'Error procesando la descarga', detalle: error.message });
        }
    }

    /**
     * Endpoint: GET /api/facturas/:clave/xml
     * Descarga el XML firmado del comprobante electrónico.
     */
    static async descargarXML(req: Request, res: Response) {
        try {
            const clave = req.params.clave as string;
            if (!clave) {
                return res.status(400).json({ error: 'La clave numérica es obligatoria.' });
            }

            const doc: any = await prisma.documentoElectronico.findUnique({
                where: { claveNumerica: clave },
                include: { xmlAlmacen: true }
            });

            if (!doc || !doc.xmlAlmacen?.xmlFirmado) {
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
     * Lista el historial de facturas del emisor
     */
    static async listarFacturas(req: Request, res: Response) {
        try {
            const emisorId = req.query.emisorId as string;

            if (!emisorId) {
                return res.status(400).json({ error: 'El parámetro emisorId es obligatorio' });
            }

            const documentos = await prisma.documentoElectronico.findMany({
                where: { emisorId },
                orderBy: { fechaEmision: 'desc' },
                take: 50 // Limit to latest 50 for performance
            });

            return res.json(documentos);
        } catch (error: any) {
            console.error('Error Controller - ListarFacturas:', error);
            return res.status(500).json({ error: 'Error al listar las facturas', detalle: error.message });
        }
    }

    /**
     * Endpoint: POST /api/facturas/tiquete
     */
    static async emitirTiquete(req: Request, res: Response) {
        return FacturacionController.procesarDocumento(req, res, '04');
    }

    /**
     * Endpoint: POST /api/facturas/nota-credito
     */
    static async emitirNotaCredito(req: Request, res: Response) {
        return FacturacionController.procesarDocumento(req, res, '03');
    }

    /**
     * Endpoint: POST /api/facturas/nota-debito
     */
    static async emitirNotaDebito(req: Request, res: Response) {
        return FacturacionController.procesarDocumento(req, res, '02');
    }

    private static async procesarDocumento(req: Request, res: Response, tipoDocumento: '01' | '02' | '03' | '04') {
        try {
            const { emisorId, factura } = req.body;
            if (!emisorId || !factura) {
                return res.status(400).json({ error: 'Parámetros inválidos. Requiere emisorId y objeto factura.' });
            }
            const parsedFactura = factura as CreacionFacturaRequest;
            const resultadoRespuesta = await FacturacionService.emitirFacturaElectronica(emisorId, parsedFactura, tipoDocumento);

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
}
