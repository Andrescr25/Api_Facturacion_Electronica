import puppeteer, { Browser } from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import { CreacionFacturaRequest } from '../models/FacturaTypes';
import { EmisorCredenciales } from '@prisma/client';

/**
 * [OPS-02] Instancia compartida de Chromium (singleton).
 * En lugar de lanzar un nuevo proceso por cada PDF, reutilizamos el mismo browser
 * y creamos una nueva página por invocación. Esto reduce drásticamente el consumo
 * de RAM (de ~150MB por request a ~150MB total).
 */
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browserInstance || !browserInstance.connected) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        // Limpiar referencia si el browser se cierra inesperadamente
        browserInstance.on('disconnected', () => {
            browserInstance = null;
        });
    }
    return browserInstance;
}

// Cierre graceful al apagar el servidor
process.on('SIGTERM', async () => {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
});

process.on('SIGINT', async () => {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
});

export class PdfGeneratorService {

    /**
     * Genera un Buffer PDF a partir de los datos del comprobante.
     * Usa la instancia de browser compartida — no lanza un nuevo proceso Chromium.
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

        // Obtener el browser compartido (no lanza uno nuevo por request)
        const browser = await getBrowser();
        const page = await browser.newPage();

        try {
            await page.setContent(htmlRenderizado, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
            });

            return Buffer.from(pdfBuffer);
        } finally {
            // Siempre cerrar la página (no el browser) al terminar
            await page.close();
        }
    }
}
