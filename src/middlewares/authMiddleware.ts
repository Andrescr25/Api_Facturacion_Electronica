import { Request, Response, NextFunction } from 'express';
import admin from '../utils/firebaseAdmin';
import prisma from '../utils/prismaClient';

// Extender la interfaz Request para incluir el user
declare global {
    namespace Express {
        interface Request {
            user?: { uid: string; email?: string; [key: string]: any };
        }
    }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado o inválido.' });
        }

        const token = authHeader.split('Bearer ')[1];

        // 1. Si es una API Key generada por nosotros (empieza con sk_live_)
        if (token.startsWith('sk_live_')) {
            const apiKey = await prisma.apiKey.findFirst({
                where: { key: token, activa: true }
            });

            if (!apiKey) {
                return res.status(401).json({ error: 'API Key inválida o revocada.' });
            }

            // Actualizar último uso (fire and forget)
            prisma.apiKey.update({ where: { id: apiKey.id }, data: { ultimoUso: new Date() } }).catch(console.error);

            req.user = { uid: apiKey.emisorId };
            return next();
        }

        // 2. Si no es API Key, asumimos que es Firebase Auth (uso del frontend administrativo)
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error de autenticación:', error);
        return res.status(401).json({ error: 'Token de autenticación expirado o inválido.' });
    }
};
