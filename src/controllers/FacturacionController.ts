import { Request, Response } from 'express';
import { FacturacionService } from '../services/FacturacionService';
import { CreacionFacturaRequest } from '../models/FacturaTypes';

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
                return res.status(404).json({ error: 'La PDF no está disponible. No se generó o no existe el comprobante.' });
            }

            return res.download(pdfPath, `Factura_${clave}.pdf`);
        } catch (error: any) {
            return res.status(500).json({ error: 'Error procesando la descarga', detalle: error.message });
        }
    }
}
