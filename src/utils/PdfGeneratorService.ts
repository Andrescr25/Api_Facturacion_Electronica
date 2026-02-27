import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import { CreacionFacturaRequest } from '../models/FacturaTypes';
import { EmisorCredenciales } from '@prisma/client';

export class PdfGeneratorService {

    /**
     * Genera un Buffer PDF a partir de los datos del comprobante
     */
    static async generarFacturaPDF(
        request: CreacionFacturaRequest,
        emisor: EmisorCredenciales,
        clave: string,
        consecutivo: string,
        tipoDocumento: '01' | '02' | '03' | '04'
    ): Promise<Buffer> {

        let tipoDocumentoNombre = 'Factura Electrónica';
        switch (tipoDocumento) {
            case '02': tipoDocumentoNombre = 'Nota de Débito Electrónica'; break;
            case '03': tipoDocumentoNombre = 'Nota de Crédito Electrónica'; break;
            case '04': tipoDocumentoNombre = 'Tiquete Electrónico'; break;
        }

        const templatePath = path.join(__dirname, '../templates/factura.ejs');

        const dataTemplate = {
            emisor: {
                nombre: emisor.nombre,
                identificacion: emisor.identificacion
            },
            receptor: request.receptor,
            tipoDocumentoNombre,
            consecutivo,
            clave,
            fechaEmision: new Date().toLocaleString('es-CR'),
            moneda: request.resumenFactura.codigoMoneda || 'CRC',
            lineas: request.lineasDetalle,
            resumen: request.resumenFactura
        };

        // Renderizar la plantilla HTML utilizando EJS
        const htmlRenderizado = await ejs.renderFile(templatePath, dataTemplate);

        // Levantar Puppeteer para crear el PDF
        // (En entornos Docker/Linux podría requerir --no-sandbox)
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlRenderizado, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });

        await browser.close();

        return Buffer.from(pdfBuffer);
    }
}
