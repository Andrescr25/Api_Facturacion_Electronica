import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';

/**
 * Middleware para proteger rutas del web API público (ej. /api/facturas/*).
 * Verifica la existencia de la API Key en el header de autorización,
 * valida su estado activo y controla el límite de 30 peticiones por mes natural.
 *
 * [RATE-02] La comprobación de límite y el incremento se realizan en una sola
 * operación SQL atómica (UPDATE ... RETURNING) para evitar race conditions
 * bajo concurrencia alta.
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
        const mesActualFormat = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;

        // [RATE-02] Operación ATÓMICA: reset del mes + verificación de límite + incremento
        // en un solo UPDATE. Si el límite está alcanzado, la query retorna 0 filas.
        const resultado = await prisma.$queryRaw<{ id: string }[]>`
            UPDATE "EmisorCredenciales"
            SET
                "usoMensualApi" = CASE
                    WHEN "mesUsoActual" != ${mesActualFormat} THEN 1
                    ELSE "usoMensualApi" + 1
                END,
                "mesUsoActual" = ${mesActualFormat}
            WHERE
                id = ${emisor.id}
                AND (
                    "mesUsoActual" != ${mesActualFormat}
                    OR "usoMensualApi" < 30
                )
            RETURNING id
        `;

        // Si no se actualizó ninguna fila → límite de 30 alcanzado
        if (!resultado || resultado.length === 0) {
            return res.status(429).json({
                error: 'Too Many Requests',
                detalle: 'Has alcanzado el límite gratuito de 30 facturas por mes. Contacta a soporte para un plan superior.'
            });
        }

        // 2. Actualizar último uso de la API Key (fire and forget)
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { ultimoUso: fechaActual }
        }).catch(console.error);

        // 3. Inyectar el emisorId verificado para uso en controllers posteriores
        req.user = { uid: emisor.id };

        next();
    } catch (error: any) {
        console.error('API Key Middleware Error:', error);
        return res.status(500).json({ error: 'Error del servidor validando la API Key.' });
    }
};
