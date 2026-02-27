import nodemailer from 'nodemailer';

export class EmailNotificationService {

    /**
     * Envía por correo electrónico la representación gráfica y los XMLs al cliente receptor.
     * @param to Correo del cliente receptor
     * @param subject Asunto del correo
     * @param body Cuerpo en HTML del correo
     * @param pdfBuffer Archivo PDF generado
     * @param xmlFirmado Base64 o Texto del XML enviado
     * @param xmlRespuesta Base64 o Texto del XML devuelto por Hacienda
     * @param clave Clave numérica del documento
     */
    static async enviarFacturaReceptor(
        to: string,
        subject: string,
        body: string,
        pdfBuffer: Buffer,
        xmlFirmado: string,
        xmlRespuesta: string,
        clave: string
    ): Promise<boolean> {
        try {
            // Configurar el transportador SMTP (Debe parametrizarse en .env real)
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: process.env.SMTP_SECURE === 'true' || true,
                auth: {
                    user: process.env.SMTP_USER || 'tu-correo@gmail.com',
                    pass: process.env.SMTP_PASS || 'tu-password-de-aplicacion'
                }
            });

            // Rehidratar base64 si vienen en ese formato desde la BD
            const xmlFirmadoBuffer = this.isBase64(xmlFirmado) ? Buffer.from(xmlFirmado, 'base64') : Buffer.from(xmlFirmado);
            const xmlRespuestaBuffer = this.isBase64(xmlRespuesta) ? Buffer.from(xmlRespuesta, 'base64') : Buffer.from(xmlRespuesta);

            await transporter.sendMail({
                from: process.env.SMTP_USER || '"Facturación Electrónica" <no-reply@empresa.com>',
                to,
                subject,
                html: body,
                attachments: [
                    {
                        filename: `Factura_${clave}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    },
                    {
                        filename: `Factura_${clave}_Firmado.xml`,
                        content: xmlFirmadoBuffer,
                        contentType: 'application/xml'
                    },
                    {
                        filename: `Factura_${clave}_Respuesta_Hacienda.xml`,
                        content: xmlRespuestaBuffer,
                        contentType: 'application/xml'
                    }
                ]
            });

            console.log(`✉️ Correo enviado exitosamente a ${to} para el documento ${clave}`);
            return true;
        } catch (error: any) {
            console.error(`❌ Error enviando notificación por correo para ${clave}:`, error.message);
            return false;
        }
    }

    private static isBase64(str: string): boolean {
        if (!str || str.length === 0) return false;
        const b64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        return b64Regex.test(str.trim());
    }
}
