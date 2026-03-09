import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';

export class ConfiguracionController {
    /**
     * Endpoint: GET /api/configuracion
     * Obtiene los datos de configuración del emisor logueado,
     * sin exponer las contraseñas reales ni archivos, 
     * solo flags indicando si existen.
     */
    static async getConfiguracion(req: Request, res: Response) {
        try {
            const emisorId = req.query.emisorId as string || "tu-emisor-id"; // TODO: Mover a auth

            const emisor = await prisma.emisorCredenciales.findUnique({
                where: { id: emisorId }
            });

            if (!emisor) {
                return res.status(404).json({ error: 'Emisor no encontrado' });
            }

            return res.json({
                id: emisor.id,
                nombre: emisor.nombre,
                identificacion: emisor.identificacion,
                usuarioAtv: emisor.usuarioAtv,
                hasPasswordAtv: Boolean(emisor.passwordAtv),
                hasCertificado: Boolean(emisor.certificadoP12),
                hasPinCertificado: Boolean(emisor.pinCertificado)
            });
        } catch (error: any) {
            console.error('Error ConfiguracionController - GET:', error);
            return res.status(500).json({ error: 'Error interno de configuración' });
        }
    }

    /**
     * Endpoint: PUT /api/configuracion
     * Actualiza los datos textuales (ATV, nombre, etc)
     */
    static async updateConfiguracion(req: Request, res: Response) {
        try {
            const emisorId = req.query.emisorId as string || "tu-emisor-id";
            const { nombre, identificacion, usuarioAtv, passwordAtv } = req.body;

            // Construir payload dinámico (no sobreescribir con blancos)
            const updateData: any = {};
            if (nombre) updateData.nombre = nombre;
            if (identificacion) updateData.identificacion = identificacion;
            if (usuarioAtv) updateData.usuarioAtv = usuarioAtv;
            if (passwordAtv) updateData.passwordAtv = passwordAtv; // TODO: En una app real, esto debe encriptarse en BD

            await prisma.emisorCredenciales.update({
                where: { id: emisorId },
                data: updateData
            });

            return res.json({ message: 'Configuración de usuario actualizada correctamente' });
        } catch (error) {
            console.error('Error ConfiguracionController - PUT:', error);
            return res.status(500).json({ error: 'Error al actualizar configuración' });
        }
    }

    /**
     * Endpoint: POST /api/configuracion/certificado
     * Recibe por 'multipart/form-data' el archivo físico (.p12) y su PIN.
     */
    static async uploadCertificado(req: Request, res: Response) {
        try {
            const emisorId = req.query.emisorId as string || "tu-emisor-id";

            if (!req.file) {
                return res.status(400).json({ error: 'No se subió ningún archivo .p12' });
            }

            const { pinCertificado } = req.body;
            if (!pinCertificado) {
                return res.status(400).json({ error: 'El PIN del certificado es requerido' });
            }

            // Convertir Node Buffer a Uint8Array que Prisma necesita para el target db.Bytes
            const uint8ArrayBuffer = new Uint8Array(req.file.buffer);

            await prisma.emisorCredenciales.update({
                where: { id: emisorId },
                data: {
                    certificadoP12: uint8ArrayBuffer,
                    pinCertificado: pinCertificado
                }
            });

            return res.status(200).json({ message: 'Certificado p12 importado correctamente' });
        } catch (error) {
            console.error('Error ConfiguracionController - POST certificado:', error);
            return res.status(500).json({ error: 'Error procesando el certificado criptográfico' });
        }
    }
}
