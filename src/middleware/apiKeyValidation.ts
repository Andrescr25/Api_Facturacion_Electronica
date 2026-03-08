import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';

/**
 * Middleware para proteger rutas del web API público (ej. /api/facturas/*).
 * Verifica la existencia de la API Key en el header de autorización,
 * valida su estado activo y controla el límite de 30 peticiones por mes natural.
 */
export const requireApiKeyAndRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Falta la API Key. Usa el formato: Authorization: Bearer sk_live_...' });
        }

        const token = authHeader.split(' ')[1];

        // 1. Validar Token en Base de Datos
        const apiKey = await prisma.apiKey.findUnique({
            where: { key: token },
            include: { emisor: true }
        });

        if (!apiKey) {
            return res.status(401).json({ error: 'API Key inválida o no registrada.' });
        }

        if (!apiKey.activa) {
            return res.status(403).json({ error: 'Esta API Key ha sido desactivada o revocada.' });
        }

        const emisor = apiKey.emisor;
        const fechaActual = new Date();
        const mesActualFormat = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`; // ej: "2026-03"

        // 2. Controlar Ciclo Mensual y Límites
        let usosMesActual = emisor.usoMensualApi;

        // Resetear si es un mes nuevo
        if (emisor.mesUsoActual !== mesActualFormat) {
            usosMesActual = 0;
            await prisma.emisorCredenciales.update({
                where: { id: emisor.id },
                data: {
                    usoMensualApi: 0,
                    mesUsoActual: mesActualFormat
                }
            });
        }

        if (usosMesActual >= 30) {
            return res.status(429).json({
                error: 'Too Many Requests',
                detalle: 'Has alcanzado el límite gratuito de 30 facturas por mes. Contacta a soporte para un plan superior.'
            });
        }

        // 3. Registrar este nuevo uso y actualizar última fecha
        await prisma.$transaction([
            prisma.emisorCredenciales.update({
                where: { id: emisor.id },
                data: { usoMensualApi: { increment: 1 } }
            }),
            prisma.apiKey.update({
                where: { id: apiKey.id },
                data: { ultimoUso: fechaActual }
            })
        ]);

        // Guardar el emisorId validado en el req por si los controllers posteriores lo necesitan.
        // Algunos endpoints del Playground mandan el emisorId en el JSON del body, 
        // idealmente se extraerían solo del token, por ahora inyectamos el real verificado.
        req.body.emisorIdAutenticado = emisor.id;

        next();
    } catch (error: any) {
        console.error('API Key Middleware Error:', error);
        return res.status(500).json({ error: 'Error del servidor validando la API Key.' });
    }
};
