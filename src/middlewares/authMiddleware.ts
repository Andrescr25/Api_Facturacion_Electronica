import { Request, Response, NextFunction } from 'express';
import admin from '../utils/firebaseAdmin';

// Extender la interfaz Request para incluir el user
declare global {
    namespace Express {
        interface Request {
            user?: admin.auth.DecodedIdToken;
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

        // Verificar el token contra Google Firebase
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Adjuntar el token validado al Request
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error de autenticación:', error);
        return res.status(401).json({ error: 'Token de autenticación expirado o inválido.' });
    }
};
