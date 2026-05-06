import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';

export class AuthController {
    /**
     * Endpoint: POST /api/auth/sync
     * Verifica que el Emisor exista en la Base de Datos.
     * Si no existe, lo crea con valores en blanco por defecto.
     * Requiere authMiddleware, por lo tanto req.user estará disponible.
     */
    static async syncUser(req: Request, res: Response) {
        try {
            const user = req.user!; // Extraído del token por el middleware

            // Intentar encontrar al usuario en Prisma
            let emisor = await prisma.emisorCredenciales.findUnique({
                where: { id: user.uid }
            });

            // Si no existe, creamos su perfil inicial
            if (!emisor) {
                emisor = await prisma.emisorCredenciales.create({
                    data: {
                        id: user.uid,
                        nombre: user.name || user.email || 'Mi Empresa SA',
                        identificacion: '',
                        usuarioAtv: '',
                        passwordAtv: ''
                    }
                });
                console.log(`✅ Nuevo perfil de Emisor creado para Firebase UID: ${user.uid}`);
            }

            return res.json({ message: 'Sincronización exitosa', emisorId: emisor.id });
        } catch (error) {
            console.error('Error AuthController - syncUser:', error);
            return res.status(500).json({ error: 'Error al sincronizar el perfil de usuario' });
        }
    }
}
