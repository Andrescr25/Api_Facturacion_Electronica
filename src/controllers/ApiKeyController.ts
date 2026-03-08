import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import crypto from 'crypto';

export class ApiKeyController {
    /**
     * Endpoint: GET /api/keys
     * Lista las API Keys del Emisor
     */
    static async listarApiKeys(req: Request, res: Response) {
        try {
            // TODO: Obtain emisorId from session/auth (using a mock ID for now until full integration)
            // Emisor "tu-emisor-id" is used in the playground
            const emisorId = req.query.emisorId as string;

            if (!emisorId) {
                return res.status(400).json({ error: 'Emisor ID es requerido para listar las keys' });
            }

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

            return res.json(keys);
        } catch (error: any) {
            console.error('Error ApiKeyController - listarApiKeys:', error);
            return res.status(500).json({ error: 'Error al listar API Keys', detalle: error.message });
        }
    }

    /**
     * Endpoint: POST /api/keys
     * Genera una nueva API Key para el Emisor
     */
    static async generarApiKey(req: Request, res: Response) {
        try {
            const { emisorId, nombre } = req.body;

            if (!emisorId || !nombre) {
                return res.status(400).json({ error: 'Emisor ID y Nombre son requeridos' });
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
                data: apiKey
            });
        } catch (error: any) {
            console.error('Error ApiKeyController - generarApiKey:', error);
            return res.status(500).json({ error: 'Error al generar API Key', detalle: error.message });
        }
    }

    /**
     * Endpoint: DELETE /api/keys/:id
     * Revoca (elimina lógicamente o físicamente) una API Key
     */
    static async revocarApiKey(req: Request, res: Response) {
        try {
            const id = req.params.id as string;

            if (!id) {
                return res.status(400).json({ error: 'ID de API Key es requerido' });
            }

            // Eliminación física para simplificar
            await prisma.apiKey.delete({
                where: { id }
            });

            return res.json({ message: 'API Key revocada exitosamente' });
        } catch (error: any) {
            console.error('Error ApiKeyController - revocarApiKey:', error);
            return res.status(500).json({ error: 'Error al revocar API Key', detalle: error.message });
        }
    }
}
