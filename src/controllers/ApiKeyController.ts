import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import crypto from 'crypto';

export class ApiKeyController {
    /**
     * Endpoint: GET /api/keys
     * Lista las API Keys del Emisor.
     * [SEC-03] Retorna solo los últimos 4 caracteres de cada key (nunca la key completa).
     */
    static async listarApiKeys(req: Request, res: Response) {
        try {
            const emisorId = req.user!.uid;

            const keys = await prisma.apiKey.findMany({
                where: { emisorId },
                orderBy: { fechaCreacion: 'desc' },
                select: {
                    id: true,
                    nombre: true,
                    key: true,
                    activa: true,
                    fechaCreacion: true,
                    ultimoUso: true
                }
            });

            // [SEC-03] Truncar la key — nunca exponer el valor completo en el listing
            const keysTruncadas = keys.map(k => ({
                ...k,
                key: `sk_live_...${k.key.slice(-4)}`
            }));

            return res.json(keysTruncadas);
        } catch (error: any) {
            console.error('Error ApiKeyController - listarApiKeys:', error);
            return res.status(500).json({ error: 'Error al listar API Keys', detalle: error.message });
        }
    }

    /**
     * Endpoint: POST /api/keys
     * Genera una nueva API Key para el Emisor.
     * [SEC-03] Retorna la key completa SOLO en esta respuesta — no se mostrará de nuevo.
     */
    static async generarApiKey(req: Request, res: Response) {
        try {
            const emisorId = req.user!.uid;
            const { nombre } = req.body;

            if (!nombre) {
                return res.status(400).json({ error: 'Nombre es requerido' });
            }

            // Validar que el emisor exista
            const emisorExists = await prisma.emisorCredenciales.findUnique({
                where: { id: emisorId }
            });

            if (!emisorExists) {
                return res.status(404).json({ error: 'Emisor no encontrado' });
            }

            // Generar key única tipo Stripe
            const randomString = crypto.randomBytes(24).toString('hex');
            const newKey = `sk_live_${randomString}`;

            const apiKey = await prisma.apiKey.create({
                data: {
                    emisorId,
                    nombre,
                    key: newKey,
                    activa: true
                }
            });

            return res.status(201).json({
                message: 'API Key generada exitosamente',
                advertencia: '⚠️ Guarda esta clave de forma segura. No la mostraremos completa de nuevo.',
                data: {
                    id: apiKey.id,
                    nombre: apiKey.nombre,
                    key: newKey, // Completa SOLO en esta respuesta
                    activa: apiKey.activa,
                    fechaCreacion: apiKey.fechaCreacion
                }
            });
        } catch (error: any) {
            console.error('Error ApiKeyController - generarApiKey:', error);
            return res.status(500).json({ error: 'Error al generar API Key', detalle: error.message });
        }
    }

    /**
     * Endpoint: DELETE /api/keys/:id
     * Revoca (elimina) una API Key.
     * [FUNC-03] Verifica ownership: solo el dueño puede revocar su propia key.
     */
    static async revocarApiKey(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const emisorId = req.user!.uid;

            if (!id) {
                return res.status(400).json({ error: 'ID de API Key es requerido' });
            }

            // [FUNC-03] Verificar que la key pertenece al emisor autenticado
            const apiKey = await prisma.apiKey.findUnique({ where: { id } });

            if (!apiKey) {
                return res.status(404).json({ error: 'API Key no encontrada.' });
            }

            if (apiKey.emisorId !== emisorId) {
                return res.status(403).json({ error: 'No autorizado: esta API Key no pertenece a tu cuenta.' });
            }

            await prisma.apiKey.delete({ where: { id } });

            return res.json({ message: 'API Key revocada exitosamente' });
        } catch (error: any) {
            console.error('Error ApiKeyController - revocarApiKey:', error);
            return res.status(500).json({ error: 'Error al revocar API Key', detalle: error.message });
        }
    }
}
